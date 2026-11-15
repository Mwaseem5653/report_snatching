import https from "https";

export type LookupResult = { number: string; operator: string };

const API_URL = "https://checksim.net/api/v1/tools/network-operator";
const getApiKey = () => process.env.API_KEY_Network || "";

const getAndroidHeadersPool = () => {
  const apiKey = getApiKey();
  return [
    {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-S918B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36",
      "X-Requested-With": "com.mahaar.checksimnet",
      "Origin": "https://checksim.net",
      "Referer": "https://checksim.net/"
    },
    {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/121.0.6167.144 Mobile Safari/537.36",
      "X-Requested-With": "com.mahaar.checksimnet",
      "Origin": "https://checksim.net",
      "Referer": "https://checksim.net/"
    },
    {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 12; SM-G998B Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.193 Mobile Safari/537.36",
      "X-Requested-With": "com.mahaar.checksimnet",
      "Origin": "https://checksim.net",
      "Referer": "https://checksim.net/"
    },
    {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro Build/TQ3A.230805.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.5845.172 Mobile Safari/537.36",
      "X-Requested-With": "com.mahaar.checksimnet",
      "Origin": "https://checksim.net",
      "Referer": "https://checksim.net/"
    },
    {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 11; SM-A515F Build/RP1A.200720.012; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/115.0.5790.166 Mobile Safari/537.36",
      "X-Requested-With": "com.mahaar.checksimnet",
      "Origin": "https://checksim.net",
      "Referer": "https://checksim.net/"
    },
    {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; OnePlus 11 Build/SKQ1.221119.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.196 Mobile Safari/537.36",
      "X-Requested-With": "com.mahaar.checksimnet",
      "Origin": "https://checksim.net",
      "Referer": "https://checksim.net/"
    },
    {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Xiaomi 23117RK66C Build/UKQ1.230904.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.64 Mobile Safari/537.36",
      "X-Requested-With": "com.mahaar.checksimnet",
      "Origin": "https://checksim.net",
      "Referer": "https://checksim.net/"
    },
    {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 12; Vivo V2130 Build/SP1A.210812.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.5993.80 Mobile Safari/537.36",
      "X-Requested-With": "com.mahaar.checksimnet",
      "Origin": "https://checksim.net",
      "Referer": "https://checksim.net/"
    },
    {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; Infinix X6825 Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/117.0.5938.60 Mobile Safari/537.36",
      "X-Requested-With": "com.mahaar.checksimnet",
      "Origin": "https://checksim.net",
      "Referer": "https://checksim.net/"
    },
    {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; TECNO KG5k Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.43 Mobile Safari/537.36",
      "X-Requested-With": "com.mahaar.checksimnet",
      "Origin": "https://checksim.net",
      "Referer": "https://checksim.net/"
    }
  ];
};

const OPERATOR_KEYS = ["operator", "operatorName", "network", "networkName", "carrier", "company"];

function normalizePakistaniMobile(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-\(\)]/g, "").trim();
  if (cleaned.startsWith("+92")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("92") && cleaned.length === 12) {
    cleaned = "0" + cleaned.slice(2);
  } else if (cleaned.length === 10 && cleaned.startsWith("3")) {
    cleaned = "0" + cleaned;
  }
  return cleaned;
}

function findFirstString(data: any, keys: string[]): string | null {
  if (!data) return null;
  if (typeof data === "object") {
    if (Array.isArray(data)) {
      for (const item of data) {
        const res = findFirstString(item, keys);
        if (res) return res;
      }
    } else {
      for (const k of keys) {
        const v = data[k];
        if (typeof v === "string" && v.trim()) {
          return v.trim();
        }
      }
      for (const v of Object.values(data)) {
        const res = findFirstString(v, keys);
        if (res) return res;
      }
    }
  }
  return null;
}

function singleChecksimRequest(phone: string, headers: Record<string, string>): Promise<{ status: number; data: any }> {
  return new Promise((resolve) => {
    const url = new URL(API_URL);
    const postData = JSON.stringify({ phone });

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(postData),
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode || 200, data: parsed });
        } catch {
          resolve({ status: res.statusCode || 500, data: { success: false, raw: body } });
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 408, data: { success: false, error: "Timeout" } });
    });

    req.on("error", (err) => {
      resolve({ status: 500, data: { success: false, error: err.message } });
    });

    req.write(postData);
    req.end();
  });
}

export async function runChecksimLookup(numbers: string[]): Promise<LookupResult[]> {
  const headersPool = getAndroidHeadersPool();
  const results: LookupResult[] = new Array(numbers.length);

  for (let i = 0; i < numbers.length; i++) {
    const rawNum = numbers[i];
    const phone = normalizePakistaniMobile(rawNum);
    const headerIdx = Math.floor(i / 2) % headersPool.length;
    const headers = headersPool[headerIdx];

    let operator = "Not Found";
    try {
      const resp = await singleChecksimRequest(phone, headers);
      if (resp.status >= 200 && resp.status < 300) {
        const foundOp = findFirstString(resp.data, OPERATOR_KEYS);
        if (foundOp) {
          operator = foundOp;
        }
      }
    } catch {
      operator = "Error";
    }

    results[i] = { number: formatTo92Number(rawNum), operator };

    if (i < numbers.length - 1) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  return results;
}

function formatTo92Number(num: string): string {
  let clean = num.replace(/\D/g, "");
  if (clean.length < 10) return num;
  if (clean.startsWith("92") && clean.length === 12) return clean;
  if (clean.startsWith("03") && clean.length === 11) return "92" + clean.substring(1);
  if (clean.startsWith("3") && clean.length === 10) return "92" + clean;
  return clean;
}
