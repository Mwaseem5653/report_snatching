import https from "https";

export type LookupResult = { number: string; operator: string };

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
];

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 25,
  timeout: 8000,
});

const DOCTORSIM_COOKIE =
  process.env.DOCTORSIM_COOKIE ||
  "cur=EUR; PHPSESSID=0nmdf157jeosksc2qt1s0htsva; _doctorsim=4552f05520a64dab9f48b3ec1592517c; cf_clearance=ChrTooXR7o3kh574NMMMCx2iSOUt1n8r2Jhd4YoILDCU_KRTGbNQg622VWen-n4-uqqZA8D31T6UDtIULDCz7-ZTJf1BI-ZnJoXDD5sLz2wou_b5sqy4fhFW2Ks4KC_v0wM11Y-4Vq5epGnx5j-j53MUOcmmjHJebTrsm_7PMMIYLtLgfPGWuTzBro34cQ2fSg_Pxg5Yxt2plymRX3uYJzibMcAxAfWTHZQAGSu3Xa22eV11pJ0AJJrgPOGZGTkI8EdYVJTQzB0L05KRf9Fp1txTeTMoU4S3iQtinkhGR2tKEDc_S8AcVVf0FTsAO3s7KBTjKNS4DTozFCJ10J3_BTmKBTe1gCqNH5iz5GDh6vcfmALL6z2cT_I3V-H3";

const FALLBACK_RC_TOKEN = "dfasj128fadskjalk289238f__adsf12e9fds";

function normalizePakNumber(num: string): { raw: string; clean: string; intl: string } {
  const raw = String(num).trim();
  let clean = raw.replace(/\D/g, "");
  if (clean.startsWith("0092")) {
    clean = clean.slice(2);
  } else if (clean.startsWith("0") && clean.length >= 11) {
    clean = "92" + clean.slice(1);
  } else if (clean.length === 10 && clean.startsWith("3")) {
    clean = "92" + clean;
  }
  const intl = clean.startsWith("+") ? clean : "+" + clean;
  return { raw, clean, intl };
}

function parseOperatorFromUrlOrId(url?: string, idO?: string | number): string {
  if (url) {
    const lower = url.toLowerCase();
    if (lower.includes("jazz") || lower.includes("mobilink")) return "Jazz";
    if (lower.includes("telenor")) return "Telenor";
    if (lower.includes("zong")) return "Zong";
    if (lower.includes("ufone")) return "Ufone";
    if (lower.includes("warid")) return "Warid";

    const parts = url.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    const cleaned = last.replace(/^pakistan-/, "").trim();
    if (cleaned) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
  }

  const idStr = String(idO || "");
  if (idStr === "6599") return "Jazz";
  if (idStr === "5644") return "Telenor";

  return "Unknown";
}

function singleDoctorSimRequest(
  phoneIntl: string,
  userAgent: string
): Promise<{ status: number; data: any }> {
  return new Promise((resolve) => {
    const postData = new URLSearchParams({
      t: "chk_oper",
      msisdn: phoneIntl,
      lang: "en",
      sel: "2035",
      new: "pk",
      rctoken: FALLBACK_RC_TOKEN,
      rctoken_fb_reason: "turnstile_undefined",
    }).toString();

    const options: https.RequestOptions = {
      hostname: "www.doctorsim.com",
      port: 443,
      path: "/proc/proc_topup.php",
      method: "POST",
      agent: httpsAgent,
      timeout: 6000,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Content-Length": Buffer.byteLength(postData),
        "User-Agent": userAgent,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.doctorsim.com/en/pk/topup-phone/",
        "Origin": "https://www.doctorsim.com",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Cookie": DOCTORSIM_COOKIE,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode || 200, data: parsed });
        } catch {
          resolve({ status: res.statusCode || 500, data: { status: "NOK", raw: body } });
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 408, data: { status: "TIMEOUT" } });
    });

    req.on("error", () => {
      resolve({ status: 500, data: { status: "ERROR" } });
    });

    req.write(postData);
    req.end();
  });
}

async function lookupSingleNumberDoctorSim(
  rawNum: string,
  uaIdx: number
): Promise<LookupResult> {
  const { raw, clean, intl } = normalizePakNumber(rawNum);

  if (!clean || clean.length < 10) {
    return { number: raw, operator: "Invalid Number" };
  }

  const userAgent = USER_AGENTS[uaIdx % USER_AGENTS.length];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await singleDoctorSimRequest(intl, userAgent);

      if (resp.status === 200 && resp.data?.status === "OK") {
        const opName = parseOperatorFromUrlOrId(resp.data.url, resp.data.idO);
        return { number: raw, operator: opName };
      }

      if (resp.data?.status === "NOK" && resp.data?.errCode === "NOT_FOUND") {
        return { number: raw, operator: "Not Found" };
      }

      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch {
      // Try next attempt
    }
  }

  return { number: raw, operator: "Not Found" };
}

export async function runDoctorSimLookup(numbers: string[]): Promise<LookupResult[]> {
  const results: LookupResult[] = new Array(numbers.length);
  const CONCURRENCY = 5;

  for (let i = 0; i < numbers.length; i += CONCURRENCY) {
    const chunk = numbers.slice(i, i + CONCURRENCY);
    const promises = chunk.map((num, idx) => {
      return lookupSingleNumberDoctorSim(num, i + idx);
    });

    const chunkResults = await Promise.all(promises);
    for (let j = 0; j < chunkResults.length; j++) {
      results[i + j] = chunkResults[j];
    }

    if (i + CONCURRENCY < numbers.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return results;
}
