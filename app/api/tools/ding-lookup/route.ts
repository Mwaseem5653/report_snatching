import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";
import https from "https";
import crypto from "crypto";

const SECRET = process.env.SESSION_JWT_SECRET!;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type LookupResult = { number: string; operator: string };

// Cloudflare Anycast IPs for api-v2.www.ding.com (eliminates slow/blocked DNS lookups)
const CLOUDFLARE_IPS = ["104.18.15.195", "104.18.14.195"];

// Shared keep-alive agent to reuse TCP + TLS connections
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5,
  keepAliveMsecs: 20000,
  timeout: 10000,
});

// Authentic Browser Profiles
const BROWSER_PROFILES: { headers: Record<string, string> }[] = [
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    },
  },
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-ch-ua": '"Google Chrome";v="120", "Chromium";v="120", "Not?A_Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    },
  },
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    },
  },
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.5",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    },
  },
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Origin": "https://www.ding.com",
      "Referer": "https://www.ding.com/topup",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    },
  },
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

function singleDingRequest(
  cleanNum: string,
  profile: { headers: Record<string, string> }
): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    try {
      const targetIp = CLOUDFLARE_IPS[Math.floor(Math.random() * CLOUDFLARE_IPS.length)];
      const payload = JSON.stringify({
        phoneNumber: cleanNum,
        selectedCountryIso: "PK",
        uniqueId: crypto.randomUUID(),
      });

      const headers: Record<string, string> = {
        ...profile.headers,
        "Host": "api-v2.www.ding.com",
        "Content-Type": "application/json",
        "Content-Length": String(Buffer.byteLength(payload)),
      };

      const req = https.request(
        {
          host: targetIp,
          servername: "api-v2.www.ding.com",
          port: 443,
          path: "/api/operatorlookup",
          method: "POST",
          agent: keepAliveAgent,
          headers: headers,
          timeout: 8000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            resolve({ status: res.statusCode || 0, data });
          });
        }
      );

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.write(payload);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function runDingLookup(numbers: string[]): Promise<LookupResult[]> {
  const results: LookupResult[] = [];
  let profileIdx = Math.floor(Math.random() * BROWSER_PROFILES.length);

  for (let i = 0; i < numbers.length; i++) {
    const { raw, clean } = normalizePakNumber(numbers[i]);

    if (!clean || clean.length < 10) {
      results.push({ number: raw, operator: "Invalid Number" });
      continue;
    }

    let success = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!success && attempts < maxAttempts) {
      attempts++;
      const currentProfile = BROWSER_PROFILES[profileIdx];

      try {
        const resp = await singleDingRequest(clean, currentProfile);

        if (resp.status === 200) {
          try {
            const parsed = JSON.parse(resp.data);
            const ops = parsed?.operators || [];
            const opName = ops.length > 0 ? ops[0]?.name || "Unknown" : "Not Found";
            results.push({ number: raw, operator: opName });
          } catch {
            results.push({ number: raw, operator: "Parse Error" });
          }
          success = true;
        } else if (resp.status === 403 || resp.status === 429) {
          profileIdx = (profileIdx + 1) % BROWSER_PROFILES.length;
          await new Promise((r) => setTimeout(r, 600));
          continue;
        } else {
          results.push({ number: raw, operator: `HTTP ${resp.status}` });
          success = true;
        }
      } catch (err: any) {
        if (attempts >= maxAttempts) {
          results.push({ number: raw, operator: "API Error" });
          success = true;
        } else {
          profileIdx = (profileIdx + 1) % BROWSER_PROFILES.length;
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    if (i < numbers.length - 1) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  return results;
}

export async function POST(req: NextRequest) {
  try {
    const { numbers } = await req.json();

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: "Invalid numbers provided" }, { status: 400 });
    }

    if (numbers.length > 50) {
      return NextResponse.json({ error: "Only 50 numbers allowed per request." }, { status: 400 });
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
