import crypto from "crypto";
import { HttpsProxyAgent } from "https-proxy-agent";

export type LookupResult = { number: string; operator: string };

// ─── Proxy Pool ────────────────────────────────────────────────────────────
const RAW_PROXIES = [
  "64.137.10.153:5803:uuoigtaj:h7fsj0j9wrow",
  "45.38.107.97:6014:uuoigtaj:h7fsj0j9wrow",
  "23.26.71.145:5628:uuoigtaj:h7fsj0j9wrow",
  "191.96.254.138:6185:uuoigtaj:h7fsj0j9wrow",
  "198.23.243.226:6361:uuoigtaj:h7fsj0j9wrow",
  "64.137.10.153:5803:ntrpjalu:3tcccxvn3wlz",
  "45.38.107.97:6014:ntrpjalu:3tcccxvn3wlz",
  "23.26.71.145:5628:ntrpjalu:3tcccxvn3wlz",
  "191.96.254.138:6185:ntrpjalu:3tcccxvn3wlz",
  "198.23.243.226:6361:ntrpjalu:3tcccxvn3wlz",
];

// Build proxy URLs: http://user:pass@host:port
const PROXY_URLS: string[] = RAW_PROXIES.map((entry) => {
  const parts = entry.split(":");
  const host = parts[0];
  const port = parts[1];
  const user = parts[2];
  const pass = parts[3];
  if (user && pass) {
    return `http://${user}:${pass}@${host}:${port}`;
  }
  return `http://${host}:${port}`;
});

// Blacklist: proxy URL → unblock timestamp
const proxyBlacklist = new Map<string, number>();

function getHealthyProxy(): string {
  const now = Date.now();
  const available = PROXY_URLS.filter((p) => {
    const blockedUntil = proxyBlacklist.get(p) || 0;
    return now > blockedUntil;
  });
  const pool = available.length > 0 ? available : PROXY_URLS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function markBlocked(proxyUrl: string) {
  // 5 minute cooldown
  proxyBlacklist.set(proxyUrl, Date.now() + 5 * 60 * 1000);
}

// ─── Browser Profiles ──────────────────────────────────────────────────────
const BROWSER_PROFILES = [
  {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.5",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
  },
  {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
  },
  {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:134.0) Gecko/20100101 Firefox/134.0",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.5",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
  },
  {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.5",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
  },
  {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.5",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
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

// ─── Single Ding Request via fetch + HttpsProxyAgent ──────────────────────
async function singleDingFetch(
  cleanNum: string,
  profile: Record<string, string>,
  proxyUrl: string
): Promise<{ status: number; operators: string[] }> {
  const agent = new HttpsProxyAgent(proxyUrl);

  const payload = JSON.stringify({
    phoneNumber: cleanNum,
    selectedCountryIso: "PK",
    uniqueId: crypto.randomUUID(),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch("https://api-v2.www.ding.com/api/operatorlookup", {
      method: "POST",
      // @ts-ignore — Node fetch accepts agent
      agent,
      signal: controller.signal,
      headers: {
        ...profile,
        "Origin": "https://www.ding.com",
        "Referer": "https://www.ding.com/topup",
        "Content-Type": "application/json",
        "Accept-Encoding": "identity",
      },
      body: payload,
    });

    clearTimeout(timer);

    const text = await res.text();

    if (res.status === 403 || res.status === 429) {
      return { status: res.status, operators: [] };
    }

    if (res.status === 200) {
      try {
        // Find JSON object in response (may have extra chars)
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        const jsonStr = start !== -1 && end > start ? text.slice(start, end + 1) : text;
        const parsed = JSON.parse(jsonStr);
        const ops: string[] = (parsed?.operators || [])
          .filter((o: any) => o?.name)
          .map((o: any) => formatOperatorName(o.name));
        return { status: 200, operators: ops };
      } catch {
        return { status: 200, operators: [] };
      }
    }

    return { status: res.status, operators: [] };
  } catch (err: any) {
    clearTimeout(timer);
    throw err;
  }
}

// ─── Lookup single number with retry across proxies ───────────────────────
async function lookupSingleNumber(
  rawNum: string,
  profileIdx: number
): Promise<LookupResult> {
  const { raw, clean } = normalizePakNumber(rawNum);

  if (!clean || clean.length < 10) {
    return { number: raw, operator: "Invalid Number" };
  }

  const maxAttempts = Math.min(10, PROXY_URLS.length * 2);
  let pIdx = profileIdx;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const proxyUrl = getHealthyProxy();
    const profile = BROWSER_PROFILES[pIdx % BROWSER_PROFILES.length];

    try {
      const result = await singleDingFetch(clean, profile, proxyUrl);

      if (result.status === 200 && result.operators.length > 0) {
        return { number: raw, operator: result.operators[0] };
      }

      if (result.status === 403 || result.status === 429) {
        markBlocked(proxyUrl);
      }
    } catch {
      markBlocked(proxyUrl);
    }

    pIdx++;
  }

  return { number: raw, operator: "Not Found" };
}

// ─── Main Export ───────────────────────────────────────────────────────────
export async function runDingLookup(numbers: string[]): Promise<LookupResult[]> {
  const results: LookupResult[] = new Array(numbers.length);
  const CONCURRENCY = 3;
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

    currentProfileIdx = (currentProfileIdx + CONCURRENCY) % BROWSER_PROFILES.length;

    if (i + CONCURRENCY < numbers.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return results;
}
