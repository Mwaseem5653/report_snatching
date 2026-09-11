import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";

const SECRET = process.env.SESSION_JWT_SECRET!;

export const dynamic = "force-dynamic";

type LookupResult = { number: string; operator: string };

async function fetchOperator(
  cleanNum: string,
  num: string,
  attempt = 1,
  maxAttempts = 4
): Promise<LookupResult> {
  try {
    const res = await fetch(
      `https://easyload.com.pk/dingconnect.php?action=GetProviders&accountNumber=${cleanNum}`,
      {
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Referer": "https://easyload.com.pk/",
          "Accept": "application/json, text/plain, */*",
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      }
    );

    const rawText = await res.text();

    if (!res.ok) {
      console.error(
        `Dingconnect HTTP error for ${cleanNum}: status ${res.status}, body: ${rawText.slice(0, 300)}`
      );

      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        return fetchOperator(cleanNum, num, attempt + 1, maxAttempts);
      }

      return { number: num, operator: "API Error" };
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
      console.log(`[PTA Lookup API Response for ${cleanNum}]:`, data);
    } catch {
      console.error(
        `Dingconnect returned non-JSON for ${cleanNum}: ${rawText.slice(0, 300)}`
      );

      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        return fetchOperator(cleanNum, num, attempt + 1, maxAttempts);
      }

      return { number: num, operator: "API Error" };
    }

    // 🔁 Rate-limited response mila — backoff karke retry karo
    if (data?.Code === "RateLimited") {
      if (attempt < maxAttempts) {
        const backoff = 1500 * attempt; // 1.5s, 3s, 4.5s...
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
      await new Promise((r) => setTimeout(r, 1500 * attempt));
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
    const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, numbers.length * 20);
    if (!tokenCheck.success) {
      return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
    }

    const results: LookupResult[] = [];
    const batchSize = 1; // ⚠️ DingConnect ek waqt mein ek hi request accept karta hai — 1 hi rakhein

    for (let i = 0; i < numbers.length; i += batchSize) {
      const batch = numbers.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (num: string) => {
          let cleanNum = num.trim().replace(/\D/g, "");

          // Standardize to 923XXXXXXXXX format
          if (cleanNum.length >= 10) {
            cleanNum = "92" + cleanNum.slice(-10);
          }

          return fetchOperator(cleanNum, num);
        })
      );

      results.push(...batchResults);

      // ⏳ delay after each batch (except the last one)
      if (i + batchSize < numbers.length) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("PTA Lookup Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}