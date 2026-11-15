import * as net from "net";
import * as tls from "tls";
import * as crypto from "crypto";

export type LookupResult = { number: string; operator: string };

// ─── Proxy Pool ─────────────────────────────────────────────────────────────
const RAW_PROXIES = [
  // Primary: Webshare Rotating Gateways (Port 80 avoids datacenter port blocks)
  "p.webshare.io:80:uuoigtaj-rotate:h7fsj0j9wrow",
  "p.webshare.io:80:ntrpjalu-rotate:3tcccxvn3wlz",
  // Backup: Direct Proxies
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

interface ProxyConfig {
  id: string;
  host: string;
  port: number;
  authHeader?: string;
  isRotating?: boolean;
}

const PROXY_POOL: ProxyConfig[] = RAW_PROXIES.map((entry) => {
  const [host, port, user, pass] = entry.split(":");
  return {
    id: `${host}:${port}`,
    host,
    port: parseInt(port, 10),
    authHeader: user && pass
      ? "Basic " + Buffer.from(`${user}:${pass}`).toString("base64")
      : undefined,
    isRotating: host === "p.webshare.io",
  };
});

const proxyBlacklist = new Map<string, number>();

function getHealthyProxy(): ProxyConfig {
  const now = Date.now();
  // Always prefer healthy rotating proxies first
  const rotating = PROXY_POOL.filter(
    (p) => p.isRotating && now > (proxyBlacklist.get(p.id) || 0)
  );
  if (rotating.length > 0) {
    return rotating[Math.floor(Math.random() * rotating.length)];
  }

  const available = PROXY_POOL.filter(
    (p) => now > (proxyBlacklist.get(p.id) || 0)
  );
  const pool = available.length > 0 ? available : PROXY_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

function markBlocked(id: string) {
  // Rotating proxies assign a different exit IP on each connection, so only 2s cooldown
  const backoff = id.startsWith("p.webshare.io") ? 2 * 1000 : 3 * 60 * 1000;
  proxyBlacklist.set(id, Date.now() + backoff);
}

// ─── Browser Profiles ───────────────────────────────────────────────────────
const BROWSER_PROFILES: { headers: Record<string, string> }[] = [
  { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0", "Accept": "application/json, text/plain, */*", "Accept-Language": "en-US,en;q=0.5" } },
  { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0", "Accept": "application/json, text/plain, */*", "Accept-Language": "en-US,en;q=0.9" } },
  { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:134.0) Gecko/20100101 Firefox/134.0", "Accept": "application/json, text/plain, */*", "Accept-Language": "en-US,en;q=0.5" } },
  { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0", "Accept": "application/json, text/plain, */*", "Accept-Language": "en-US,en;q=0.5" } },
  { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0", "Accept": "application/json, text/plain, */*", "Accept-Language": "en-US,en;q=0.5" } },
];

// ─── Decode HTTP/1.1 chunked transfer encoding ──────────────────────────────
function decodeChunked(raw: string): string {
  if (!/^[0-9a-fA-F]+\r\n/.test(raw.trim())) return raw;
  let result = "";
  let pos = 0;
  while (pos < raw.length) {
    const lineEnd = raw.indexOf("\r\n", pos);
    if (lineEnd === -1) break;
    const chunkSize = parseInt(raw.slice(pos, lineEnd).split(";")[0].trim(), 16);
    if (isNaN(chunkSize) || chunkSize === 0) break;
    pos = lineEnd + 2;
    result += raw.slice(pos, pos + chunkSize);
    pos += chunkSize + 2;
  }
  return result || raw;
}

function extractJson(raw: string): string {
  const decoded = decodeChunked(raw);
  const s = decoded.indexOf("{");
  const e = decoded.lastIndexOf("}");
  if (s !== -1 && e > s) return decoded.slice(s, e + 1);
  const s2 = raw.indexOf("{");
  const e2 = raw.lastIndexOf("}");
  if (s2 !== -1 && e2 > s2) return raw.slice(s2, e2 + 1);
  return raw;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function normalizePakNumber(num: string) {
  const raw = String(num).trim();
  let clean = raw.replace(/\D/g, "");
  if (clean.startsWith("0092")) clean = clean.slice(2);
  else if (clean.startsWith("0") && clean.length >= 11) clean = "92" + clean.slice(1);
  else if (clean.length === 10 && clean.startsWith("3")) clean = "92" + clean;
  return { raw, clean };
}

function formatOperatorName(name: string): string {
  const t = name.trim();
  return t.toLowerCase() === "mobilink" ? "Jazz" : t;
}

// ─── Raw TCP → TLS tunnel (NO ALPN = no Cloudflare 403) ────────────────────
// IMPORTANT: Do NOT set ALPNProtocols — Cloudflare blocks if ALPN is present
function singleDingRequest(
  cleanNum: string,
  profile: { headers: Record<string, string> },
  proxy: ProxyConfig
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const socket = net.connect(
      { host: proxy.host, port: proxy.port, timeout: 4500 },
      () => {
        // Step 1: HTTP CONNECT tunnel
        let connectReq =
          `CONNECT api-v2.www.ding.com:443 HTTP/1.1\r\n` +
          `Host: api-v2.www.ding.com:443\r\n`;
        if (proxy.authHeader) {
          connectReq += `Proxy-Authorization: ${proxy.authHeader}\r\n`;
        }
        connectReq += `Proxy-Connection: keep-alive\r\n\r\n`;
        socket.write(connectReq);

        socket.once("data", (d) => {
          const connectResp = d.toString();
          if (!connectResp.includes("200")) {
            socket.destroy();
            if (!resolved) {
              resolved = true;
              reject(new Error("Proxy CONNECT failed: " + connectResp.split("\r\n")[0]));
            }
            return;
          }

          // Step 2: TLS — NO ALPNProtocols (critical: avoids Cloudflare 403)
          const tlsSocket = tls.connect(
            {
              socket,
              servername: "api-v2.www.ding.com",
              rejectUnauthorized: false,
              // ⚠️ Do NOT add ALPNProtocols here — causes CF 403
            },
            () => {
              // Step 3: HTTP/1.1 POST
              const payload = JSON.stringify({
                phoneNumber: cleanNum,
                selectedCountryIso: "PK",
                uniqueId: crypto.randomUUID(),
              });

              const req = [
                "POST /api/operatorlookup HTTP/1.1",
                "Host: api-v2.www.ding.com",
                `User-Agent: ${profile.headers["User-Agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0"}`,
                `Accept: ${profile.headers["Accept"] || "application/json, text/plain, */*"}`,
                `Accept-Language: ${profile.headers["Accept-Language"] || "en-US,en;q=0.5"}`,
                "Accept-Encoding: identity",
                "Origin: https://www.ding.com",
                "Referer: https://www.ding.com/topup",
                "Content-Type: application/json",
                `Content-Length: ${Buffer.byteLength(payload)}`,
                "Connection: close",
                "",
                payload,
              ].join("\r\n");

              tlsSocket.write(req);
            }
          );

          const chunks: Buffer[] = [];
          tlsSocket.on("data", (c) => chunks.push(c));
          tlsSocket.on("end", () => {
            if (!resolved) {
              resolved = true;
              const raw = Buffer.concat(chunks).toString("utf8");
              const firstLine = raw.split("\r\n")[0] || "";
              const statusMatch = firstLine.match(/HTTP\/\S+\s+(\d+)/);
              const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
              const body = raw.split("\r\n\r\n").slice(1).join("\r\n\r\n");
              console.log(`[Ding] proxy=${proxy.id} status=${status} bodyLen=${body.length}`);
              resolve({ status, body });
            }
          });

          tlsSocket.on("error", (err) => {
            socket.destroy();
            if (!resolved) { resolved = true; reject(err); }
          });

          tlsSocket.setTimeout(4500, () => {
            socket.destroy();
            if (!resolved) { resolved = true; reject(new Error("TLS timeout")); }
          });
        });
      }
    );

    socket.on("timeout", () => {
      socket.destroy();
      if (!resolved) { resolved = true; reject(new Error("TCP timeout")); }
    });

    socket.on("error", (err) => {
      if (!resolved) { resolved = true; reject(err); }
    });
  });
}

function getPrefixFallback(clean: string): string {
  const num = clean.startsWith("92") ? clean.slice(2) : clean.startsWith("0") ? clean.slice(1) : clean;
  const prefix = num.slice(0, 3);
  const map: Record<string, string> = {
    "300": "Jazz", "301": "Jazz", "302": "Jazz", "303": "Jazz", "304": "Jazz",
    "305": "Jazz", "306": "Jazz", "307": "Jazz", "308": "Jazz", "309": "Jazz",
    "310": "Zong", "311": "Zong", "312": "Zong", "313": "Zong", "314": "Zong",
    "315": "Zong", "316": "Zong", "317": "Zong", "318": "Zong", "319": "Zong",
    "320": "Jazz / Warid", "321": "Jazz / Warid", "322": "Jazz / Warid", "323": "Jazz / Warid", "324": "Jazz / Warid",
    "325": "Jazz / Warid", "326": "Jazz / Warid", "327": "Jazz / Warid", "328": "Jazz / Warid", "329": "Jazz / Warid",
    "330": "Ufone", "331": "Ufone", "332": "Ufone", "333": "Ufone", "334": "Ufone",
    "335": "Ufone", "336": "Ufone", "337": "Ufone", "338": "Ufone", "339": "Ufone",
    "340": "Telenor", "341": "Telenor", "342": "Telenor", "343": "Telenor", "344": "Telenor",
    "345": "Telenor", "346": "Telenor", "347": "Telenor", "348": "Telenor", "349": "Telenor",
    "355": "SCO", "370": "Zong", "371": "Zong",
  };
  return map[prefix] || "Not Found";
}

// ─── Single number lookup with retry ────────────────────────────────────────
async function lookupSingleNumber(
  rawNum: string,
  profileIdx: number
): Promise<LookupResult> {
  const { raw, clean } = normalizePakNumber(rawNum);

  if (!clean || clean.length < 10) {
    return { number: raw, operator: "Invalid Number" };
  }

  // Max 3 attempts with fast 4.5s timeout to stay strictly within Vercel's limits
  const maxAttempts = 3;
  let pIdx = profileIdx;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const proxy = getHealthyProxy();
    const profile = BROWSER_PROFILES[pIdx % BROWSER_PROFILES.length];

    try {
      const { status, body } = await singleDingRequest(clean, profile, proxy);

      if (status === 200) {
        try {
          const parsed = JSON.parse(extractJson(body));
          const ops = parsed?.operators || [];
          if (ops.length > 0 && ops[0]?.name) {
            const op = formatOperatorName(ops[0].name);
            console.log(`[Ding] ✅ ${clean} → ${op}`);
            return { number: raw, operator: op };
          }
          console.warn(`[Ding] 200 but no operators: ${body.slice(0, 300)}`);
        } catch {
          console.warn(`[Ding] JSON parse fail: ${body.slice(0, 300)}`);
        }
      } else if (status === 403 || status === 429) {
        console.warn(`[Ding] Proxy blocked (${status}): ${proxy.id}`);
        markBlocked(proxy.id);
      } else {
        console.warn(`[Ding] Unexpected status ${status} for ${clean}`);
      }
    } catch (err: any) {
      console.error(`[Ding] Error attempt ${attempt + 1} proxy=${proxy.id}: ${err.message}`);
      markBlocked(proxy.id);
    }

    pIdx++;
    await new Promise((r) => setTimeout(r, 200));
  }

  const fallback = getPrefixFallback(clean);
  console.warn(`[Ding] All attempts finished for ${clean}, fallback: ${fallback}`);
  return { number: raw, operator: fallback };
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export async function runDingLookup(numbers: string[]): Promise<LookupResult[]> {
  const results: LookupResult[] = new Array(numbers.length);
  const CONCURRENCY = 3;
  let currentProfileIdx = Math.floor(Math.random() * BROWSER_PROFILES.length);

  for (let i = 0; i < numbers.length; i += CONCURRENCY) {
    const chunk = numbers.slice(i, i + CONCURRENCY);
    const promises = chunk.map((num, idx) =>
      lookupSingleNumber(num, (currentProfileIdx + idx) % BROWSER_PROFILES.length)
    );
    const chunkResults = await Promise.all(promises);
    for (let j = 0; j < chunkResults.length; j++) results[i + j] = chunkResults[j];
    currentProfileIdx = (currentProfileIdx + CONCURRENCY) % BROWSER_PROFILES.length;
    if (i + CONCURRENCY < numbers.length) await new Promise((r) => setTimeout(r, 100));
  }

  return results;
}
