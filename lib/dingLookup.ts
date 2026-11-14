import https from "https";
import tls from "tls";
import net from "net";
import crypto from "crypto";

export type LookupResult = { number: string; operator: string };

// ─── Direct Proxy Pool ────────────────────────────────────────────────
interface ProxyConfig {
  host: string;
  port: number;
  authHeader?: string;
}

const RAW_PROXIES = [
  "64.137.10.153:5803:uuoigtaj:h7fsj0j9wrow",
  "45.38.107.97:6014:uuoigtaj:h7fsj0j9wrow",
  "104.164.49.38:7693:uuoigtaj:h7fsj0j9wrow",
  "23.26.71.145:5628:uuoigtaj:h7fsj0j9wrow",
  "84.247.60.125:6095:uuoigtaj:h7fsj0j9wrow",
  "191.96.254.138:6185:uuoigtaj:h7fsj0j9wrow",
  "198.46.161.42:5092:uuoigtaj:h7fsj0j9wrow",
  "64.137.96.74:6641:uuoigtaj:h7fsj0j9wrow",
  "198.23.243.226:6361:uuoigtaj:h7fsj0j9wrow",
  "38.154.185.97:6370:uuoigtaj:h7fsj0j9wrow",
];

const PROXY_POOL: ProxyConfig[] = RAW_PROXIES.map((entry) => {
  const parts = entry.split(":");
  const host = parts[0];
  const port = parseInt(parts[1], 10);
  const authHeader =
    parts[2] && parts[3]
      ? "Basic " + Buffer.from(`${parts[2]}:${parts[3]}`).toString("base64")
      : undefined;
  return { host, port, authHeader };
});

let globalProxyIdx = 0;

function getNextProxy(): ProxyConfig {
  const proxy = PROXY_POOL[globalProxyIdx % PROXY_POOL.length];
  globalProxyIdx = (globalProxyIdx + 1) % PROXY_POOL.length;
  return proxy;
}

function singleDingRequest(
  cleanNum: string,
  profile: { headers: Record<string, string> },
  proxy: ProxyConfig
): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const socket = net.connect({ host: proxy.host, port: proxy.port, timeout: 3500 }, () => {
      let connectReq =
        `CONNECT api-v2.www.ding.com:443 HTTP/1.1\r\n` +
        `Host: api-v2.www.ding.com:443\r\n`;

      if (proxy.authHeader) {
        connectReq += `Proxy-Authorization: ${proxy.authHeader}\r\n`;
      }
      connectReq += `Proxy-Connection: keep-alive\r\n\r\n`;

      socket.write(connectReq);

      socket.once("data", (d) => {
        if (!d.toString().includes("200")) {
          socket.destroy();
          if (!resolved) {
            resolved = true;
            reject(new Error("Proxy CONNECT failed: " + d.toString().split("\r\n")[0]));
          }
          return;
        }

        const tlsSocket = tls.connect(
          {
            socket,
            servername: "api-v2.www.ding.com",
            rejectUnauthorized: false,
          },
          () => {
            const payload = JSON.stringify({
              phoneNumber: cleanNum,
              selectedCountryIso: "PK",
              uniqueId: crypto.randomUUID(),
            });

            const reqText = [
              "POST /api/operatorlookup HTTP/1.1",
              "Host: api-v2.www.ding.com",
              `User-Agent: ${profile.headers["User-Agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0"}`,
              `Accept: ${profile.headers["Accept"] || "application/json, text/plain, */*"}`,
              `Accept-Language: ${profile.headers["Accept-Language"] || "en-US,en;q=0.5"}`,
              "Origin: https://www.ding.com",
              "Referer: https://www.ding.com/topup",
              "Content-Type: application/json",
              `Content-Length: ${Buffer.byteLength(payload)}`,
              "Connection: close",
              "",
              payload,
            ].join("\r\n");

            tlsSocket.write(reqText);
          }
        );

        let resp = "";
        tlsSocket.on("data", (chunk) => (resp += chunk));
        tlsSocket.on("end", () => {
          if (!resolved) {
            resolved = true;
            const firstLine = resp.split("\r\n")[0] || "";
            const statusMatch = firstLine.match(/HTTP\/\S+\s+(\d+)/);
            const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
            const body = resp.split("\r\n\r\n").slice(1).join("\r\n\r\n");
            resolve({ status, data: body });
          }
        });

        tlsSocket.on("error", (err) => {
          socket.destroy();
          if (!resolved) {
            resolved = true;
            reject(err);
          }
        });
      });
    });

    socket.on("timeout", () => {
      socket.destroy();
      if (!resolved) {
        resolved = true;
        reject(new Error("Proxy timeout"));
      }
    });

    socket.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });
  });
}

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

function extractJsonString(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + 1);
  }
  return raw;
}

async function lookupSingleNumber(
  rawNum: string,
  profileIdx: number
): Promise<LookupResult> {
  const { raw, clean } = normalizePakNumber(rawNum);

  if (!clean || clean.length < 10) {
    return { number: raw, operator: "Invalid Number" };
  }

  let pIdx = profileIdx;
  const maxAttempts = Math.max(10, PROXY_POOL.length * 2);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const proxy = getNextProxy();

    try {
      const resp = await singleDingRequest(clean, BROWSER_PROFILES[pIdx], proxy);

      if (resp.status === 200) {
        try {
          const jsonStr = extractJsonString(resp.data);
          const parsed = JSON.parse(jsonStr);
          const ops = parsed?.operators || [];
          if (ops.length > 0 && ops[0]?.name) {
            return { number: raw, operator: formatOperatorName(ops[0].name) };
          }
        } catch {
          // JSON parse retry
        }
      }

      pIdx = (pIdx + 1) % BROWSER_PROFILES.length;

      if (attempt < maxAttempts - 1) {
        const delay = Math.min(100 * (attempt + 1), 1500);
        await new Promise((r) => setTimeout(r, delay));
      }
    } catch {
      pIdx = (pIdx + 1) % BROWSER_PROFILES.length;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  return { number: raw, operator: "Not Found" };
}

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
