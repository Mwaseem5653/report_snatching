import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";
import https from "https";
import crypto from "crypto";
import { HttpsProxyAgent } from "https-proxy-agent";

const SECRET = process.env.SESSION_JWT_SECRET!;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type LookupResult = { number: string; operator: string };

// Direct Webshare rotating proxy with Keep-Alive connection pooling for max speed
const DING_PROXY_URL = "http://ntrpjalu-rotate:3tcccxvn3wlz@p.webshare.io:80";
const proxyAgent = new HttpsProxyAgent(DING_PROXY_URL, {
  keepAlive: true,
  maxSockets: 30,
  maxFreeSockets: 15,
  keepAliveMsecs: 30000,
  timeout: 8000,
});

// Firefox-matched TLS ciphers to prevent Cloudflare bot fingerprint block
const FIREFOX_CIPHERS = [
  "TLS_AES_128_GCM_SHA256",
  "TLS_CHACHA20_POLY1305_SHA256",
  "TLS_AES_256_GCM_SHA384",
  "ECDHE-ECDSA-AES128-GCM-SHA256",
  "ECDHE-RSA-AES128-GCM-SHA256",
  "ECDHE-ECDSA-CHACHA20-POLY1305",
  "ECDHE-RSA-CHACHA20-POLY1305",
  "ECDHE-ECDSA-AES256-GCM-SHA384",
  "ECDHE-RSA-AES256-GCM-SHA384",
].join(":");

// Authentic Browser Profiles
const BROWSER_PROFILES: { headers: Record<string, string> }[] = [
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0",
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
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
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
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:134.0) Gecko/20100101 Firefox/134.0",
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
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0",
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
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.5",
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
  if (clean.startsWith("0092")) {
    clean = clean.slice(2);
  } else if (clean.startsWith("0") && clean.length >= 11) {
    clean = "92" + clean.slice(1);
  } else if (clean.length === 10 && clean.startsWith("3")) {
    clean = "92" + clean;
  }
  return { raw, clean };
}

function formatOperatorName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.toLowerCase() === "mobilink") return "Jazz";
  return trimmed;
}

function singleDingRequest(
  cleanNum: string,
  profile: { headers: Record<string, string> }
): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    try {
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
          host: "api-v2.www.ding.com",
          servername: "api-v2.www.ding.com",
          port: 443,
          path: "/api/operatorlookup",
          method: "POST",
          agent: proxyAgent,
          ciphers: FIREFOX_CIPHERS,
          honorCipherOrder: true,
          minVersion: "TLSv1.2",
          maxVersion: "TLSv1.3",
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

async function lookupSingleNumber(
  rawNum: string,
  profileIdx: number
): Promise<LookupResult> {
  const { raw, clean } = normalizePakNumber(rawNum);

  if (!clean || clean.length < 10) {
    return { number: raw, operator: "Invalid Number" };
  }

  let attempts = 0;
  const maxAttempts = 4;
  let pIdx = profileIdx;

  while (attempts < maxAttempts) {
    attempts++;
    const currentProfile = BROWSER_PROFILES[pIdx];

    try {
      const resp = await singleDingRequest(clean, currentProfile);

      if (resp.status === 200) {
        try {
          const parsed = JSON.parse(resp.data);
          const ops = parsed?.operators || [];
          const rawOpName = ops.length > 0 ? ops[0]?.name || "Unknown" : "Not Found";
          return { number: raw, operator: formatOperatorName(rawOpName) };
        } catch {
          return { number: raw, operator: "Parse Error" };
        }
      } else if (resp.status === 403 || resp.status === 429) {
        if (attempts >= maxAttempts) {
          return { number: raw, operator: "Not Found" };
        }
        pIdx = (pIdx + 1) % BROWSER_PROFILES.length;
        // Fast 50ms jitter so rotating proxy picks next clean IP immediately
        await new Promise((r) => setTimeout(r, 50));
      } else {
        return { number: raw, operator: `HTTP ${resp.status}` };
      }
    } catch (err: any) {
      if (attempts >= maxAttempts) {
        return { number: raw, operator: "API Error" };
      }
      pIdx = (pIdx + 1) % BROWSER_PROFILES.length;
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  return { number: raw, operator: "Not Found" };
}

async function runDingLookup(numbers: string[]): Promise<LookupResult[]> {
  const results: LookupResult[] = new Array(numbers.length);
  const CONCURRENCY = 3; // Process 3 numbers in parallel chunks for maximum speed
  let currentProfileIdx = Math.floor(Math.random() * BROWSER_PROFILES.length);

  for (let i = 0; i < numbers.length; i += CONCURRENCY) {
    const chunk = numbers.slice(i, i + CONCURRENCY);
    const promises = chunk.map((num, idx) => {
      const pIdx = (currentProfileIdx + idx) % BROWSER_PROFILES.length;
      return lookupSingleNumber(num, pIdx);
    });

    const chunkResults = await Promise.all(promises);
    for (let j = 0; j < chunkResults.length; j++) {
      results[i + j] = chunkResults[j];
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
