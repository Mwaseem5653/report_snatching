import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";

const SECRET = process.env.SESSION_JWT_SECRET!;

export const dynamic = "force-dynamic";

type LookupResult = { number: string; operator: string };

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Edge/122.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
];

const getHeaders = () => {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  return {
    "User-Agent": ua,
    "Referer": "https://easyload.com.pk/",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://easyload.com.pk",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin"
  };
};

async function fetchOperator(
  cleanNum: string,
  num: string,
  attempt = 1,
  maxAttempts = 5
): Promise<LookupResult> {
  try {
    const res = await fetch(
      `https://easyload.com.pk/dingconnect.php?action=GetProviders&accountNumber=${cleanNum}`,
      {
        cache: "no-store",
        headers: getHeaders(),
        signal: AbortSignal.timeout(12000), // 12s timeout
      }
    );

    const rawText = await res.text();

    if (!res.ok) {
      console.error(
        `Dingconnect HTTP error for ${cleanNum}: status ${res.status}, body: ${rawText.slice(0, 300)}`
      );

      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        return fetchOperator(cleanNum, num, attempt + 1, maxAttempts);
      }

      return { number: num, operator: "API Error" };
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
      // console.log(`[PTA Lookup API Response for ${cleanNum}]:`, data);
    } catch {
      console.error(
        `Dingconnect returned non-JSON for ${cleanNum}: ${rawText.slice(0, 300)}`
      );

      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        return fetchOperator(cleanNum, num, attempt + 1, maxAttempts);
      }

      return { number: num, operator: "API Error" };
    }

    // 🔁 Rate-limited response mila — backoff karke retry karo
    if (data?.Code === "RateLimited" || data?.ResultCode === 3) {
      console.warn(`Rate limit hit for ${cleanNum}, retrying (Attempt ${attempt}/${maxAttempts})...`);
      if (attempt < maxAttempts) {
        const backoff = 2500 * attempt; // Incremental backoff
        await new Promise((r) => setTimeout(r, backoff));
        return fetchOperator(cleanNum, num, attempt + 1, maxAttempts);
      }

      return { number: num, operator: "Rate Limited" };
    }

    const operator = data?.Items?.[0]?.Name || "Not Found";
    return { number: num, operator };
  } catch (e: any) {
    console.error(`Fetch failed for ${cleanNum}:`, e?.message || e);

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      return fetchOperator(cleanNum, num, attempt + 1, maxAttempts);
    }

    return { number: num, operator: "API Error" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { numbers } = await req.json();

    if (!numbers || !Array.isArray(numbers)) {
      return NextResponse.json({ error: "Invalid numbers provided" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded: any = jwt.verify(token, SECRET);

    // 20 tokens per number for live API identification
    const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, numbers.length * 10);
    if (!tokenCheck.success) {
      return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
    }

    const results: LookupResult[] = [];
    
    // Process one by one with a small delay to avoid "simultaneous requests" error
    for (let i = 0; i < numbers.length; i++) {
      const num = numbers[i];
      let cleanNum = num.trim().replace(/\D/g, "");

      // Standardize to 923XXXXXXXXX format
      if (cleanNum.length >= 10) {
        cleanNum = "92" + cleanNum.slice(-10);
      }

      const result = await fetchOperator(cleanNum, num);
      results.push(result);

      // ⏳ Controlled delay after each number to mimic human behavior
      if (i < numbers.length - 1) {
        const jitter = Math.floor(Math.random() * 500); // add 0-500ms random jitter
        const baseDelay = results[results.length - 1].operator === "Rate Limited" ? 3000 : 1500;
        await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("PTA Lookup Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}