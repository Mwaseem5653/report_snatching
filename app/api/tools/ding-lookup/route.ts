import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";
import crypto from "crypto";

const SECRET = process.env.SESSION_JWT_SECRET!;

export const dynamic = "force-dynamic";

type LookupResult = { number: string; operator: string };

// 10 Diverse Browser Profiles and Headers (ported from ding_lookup_worker.py)
const BROWSER_PROFILES: { headers: Record<string, string> }[] = [
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-ch-ua": '"Google Chrome";v="120", "Chromium";v="120", "Not?A_Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    }
  },
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-GB,en;q=0.8",
      "Content-Type": "application/json",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-ch-ua": '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    }
  },
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.5",
      "Content-Type": "application/json",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    }
  },
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-ch-ua": '"Google Chrome";v="118", "Chromium";v="118", "Not?A_Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    }
  },
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    }
  },
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    }
  },
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.199 Safari/537.36 OPR/100.0.4815.76",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-ch-ua": '"Not.A/Brand";v="8", "Chromium";v="114", "Opera";v="100"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    }
  },
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-ch-ua": '"Google Chrome";v="117", "Chromium";v="117", "Not?A_Brand";v="8"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    }
  },
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.5",
      "Content-Type": "application/json",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    }
  },
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-ch-ua": '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    }
  }
];

function normalizePakNumber(num: string) {
  const raw = String(num).trim();
  let clean = raw.replace(/\D/g, "");
  if (clean.startsWith("0") && clean.length >= 11) {
    clean = "92" + clean.slice(1);
  } else if (clean.length === 10 && clean.startsWith("3")) {
    clean = "92" + clean;
  }
  return { raw, clean };
}

async function runDingLookup(numbers: string[]): Promise<LookupResult[]> {
  const url = "https://api-v2.www.ding.com/api/operatorlookup";
  const results: LookupResult[] = [];
  let profileIdx = 0;
  let requestCountWithCurrentProfile = 0;

  for (let i = 0; i < numbers.length; i++) {
    const { raw, clean } = normalizePakNumber(numbers[i]);
    const payload = {
      phoneNumber: clean,
      selectedCountryIso: "PK",
      uniqueId: crypto.randomUUID()
    };

    let success = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!success && attempts < maxAttempts) {
      attempts++;

      // Rotate profile after every 10 requests (exact same behavior as python worker)
      if (requestCountWithCurrentProfile >= 10) {
        profileIdx = (profileIdx + 1) % BROWSER_PROFILES.length;
        requestCountWithCurrentProfile = 0;
        await new Promise((r) => setTimeout(r, 300));
      }

      const currentProfile = BROWSER_PROFILES[profileIdx];

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: currentProfile.headers,
          body: JSON.stringify(payload),
          cache: "no-store",
          signal: AbortSignal.timeout(12000)
        });

        requestCountWithCurrentProfile++;

        // If rate limited or blocked, rotate profile and retry
        if (res.status === 429 || res.status === 403) {
          console.warn(`Ding API status ${res.status} on attempt ${attempts}, rotating profile...`);
          profileIdx = (profileIdx + 1) % BROWSER_PROFILES.length;
          requestCountWithCurrentProfile = 0;
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        if (res.ok) {
          const data = await res.json();
          const ops = data?.operators || [];
          const opName = ops.length > 0 ? (ops[0]?.name || "Unknown") : "Not Found";
          results.push({ number: raw, operator: opName });
          success = true;
        } else {
          results.push({ number: raw, operator: `HTTP ${res.status}` });
          success = true;
        }
      } catch (err: any) {
        console.error(`Ding lookup fetch error for ${clean}:`, err?.message || err);
        if (attempts >= maxAttempts) {
          results.push({ number: raw, operator: "API Error" });
          success = true;
        } else {
          profileIdx = (profileIdx + 1) % BROWSER_PROFILES.length;
          requestCountWithCurrentProfile = 0;
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    // Small polite delay between sequential requests
    if (i < numbers.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
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

    // 10 tokens per number for live API identification
    const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, numbers.length * 10);
    if (!tokenCheck.success) {
      return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
    }

    const results = await runDingLookup(numbers);

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Ding Lookup Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
