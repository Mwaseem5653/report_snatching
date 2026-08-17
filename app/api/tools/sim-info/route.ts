import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";
import { logToolUsage } from "@/lib/usageLogger";

const SECRET = process.env.SESSION_JWT_SECRET!;

async function fetchSingleSimData(term: string) {
    const API_URL = "https://simsdatabases.com/apis/simsNumber.php";
    const CHECK_URL = "https://simsdatabases.com/apis/number_check.php";
    const APP_KEY = process.env.SIMINFO;



    if (!APP_KEY) return [];

    // Clean number: remove leading 0 if present (convert 0303... to 303...)
    const cleanNumber = term.startsWith('0') ? term.substring(1) : term;

    const fetchFromApi = async (url: string, num: string) => {
        try {
            console.log(`SIM Info Request: ${url} for ${num}`);
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Dart/3.1 (dart:io)',
                    'Accept': 'application/json',
                },
                body: new URLSearchParams({
                    'number': num,
                    'appkey': APP_KEY
                })
            });
            if (!res.ok) {
                console.error(`SIM Info API Error: ${res.status} ${res.statusText}`);
                return null;
            }
            const text = await res.text();
            console.log(`SIM Info Raw Response for ${num}:`, text);
            return JSON.parse(text);
        } catch (e) {
            console.error(`SIM Info Fetch Exception for ${num}:`, e);
            return null;
        }
    };

    const fetchFromNadra = async (num: string) => {
        const fullNum = num.startsWith('0') ? num : '0' + num;
        const NADRA_KEY = process.env.NADRA_API_KEY;
        
        console.log(`[Nadra-Lookup] Searching for: ${fullNum}`);
        if (!NADRA_KEY) {
            console.error("[Nadra-Lookup] ERROR: NADRA_API_KEY is missing in environment variables.");
            return null;
        }

        try {
            const url = `https://api.nadra.xyz/sim_api.php?search_term=${fullNum}&api_key=${NADRA_KEY}`;
            const res = await fetch(url);
            
            if (!res.ok) {
                console.error(`[Nadra-Lookup] API Error: ${res.status} ${res.statusText}`);
                return null;
            }

            const text = await res.text();
            console.log(`[Nadra-Lookup] Raw Response: ${text.substring(0, 200)}`);
            
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error("[Nadra-Lookup] JSON Parse Error");
                return null;
            }
        } catch (e: any) {
            console.error(`[Nadra-Lookup] Fetch Exception: ${e.message}`);
            return null;
        }
    };

    try {
        // --- PRIMARY API (simsdatabases.com) ---
        let data = await fetchFromApi(CHECK_URL, cleanNumber);

        // --- NADRA FALLBACK ---
        if (!data || data.error || (typeof data === 'object' && Object.keys(data).length === 0)) {
            console.log(`[Sim-Info] Primary failed, trying Nadra for ${term}`);
            data = await fetchFromNadra(term);

            if (data && data.status === "success" && Array.isArray(data.data)) {
                console.log(`[Nadra-Lookup] Processing ${data.data.length} records for ${term} from Fallback`);
                const results = data.data.map((item: any) => ({
                    name: item.name || item.Name || item.NAME || "N/A",
                    number: item.number || item.Number || term,
                    cnic: item.cnic || item.Cnic || item.CNIC || "N/A",
                    address: item.address || item.Address || item.ADDRESS || "N/A",
                    search_term: term
                }));
                return results;
            }
        }

        if (data && !data.error) {
            const results: any[] = [];
            
            // 1. Check for indexed structure ("0", "1", "2"...)
            Object.keys(data).forEach(key => {
                if (!isNaN(parseInt(key))) {
                    const item = data[key];
                    results.push({
                        name: item.name || item.Name || item.NAME || "N/A",
                        number: item.number || item.Number || term,
                        cnic: item.cnic || item.Cnic || item.CNIC || "N/A",
                        address: item.address || item.Address || item.ADDRESS || "N/A",
                        search_term: term
                    });
                }
            });

            // 2. Fallback for flat structure
            if (results.length === 0 && (data.name || data.Name || data.NAME)) {
                results.push({
                    name: data.name || data.Name || data.NAME || "N/A",
                    number: data.number || data.Number || term,
                    cnic: data.cnic || data.Cnic || data.CNIC || "N/A",
                    address: data.address || data.Address || data.ADDRESS || "N/A",
                    search_term: term
                });
            }

            console.log(`[Sim-Info] Found ${results.length} records for ${term} from fallback`);
            return results;
        }
        
        console.log(`[Sim-Info] No records found for ${term} from any source`);
        return [];
    } catch (e: any) {
        console.error(`[Sim-Info] Logic Error for ${term}:`, e.message);
        return [];
    }
}

export async function POST(req: NextRequest) {
  try {
    const { phone_number, phone_numbers } = await req.json();
    const targets: string[] = phone_numbers || (phone_number ? [phone_number] : []);

    if (targets.length === 0) {
      return NextResponse.json({ error: "Phone number or CNIC is required" }, { status: 400 });
    }

    // 🚀 Token Deduction
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sessionToken")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const decoded: any = jwt.verify(token, SECRET);

        const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, targets.length * 40);
        if (!tokenCheck.success) {
            return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
        }

        // 🚀 LOG USAGE
        await logToolUsage(decoded, "Eyecon/Info Lookup", { targets: targets.length });
    } catch (err) {
        return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    // Process in batches of 3 to avoid overwhelming or getting blocked quickly
    const allResults: any[] = [];
    for (let i = 0; i < targets.length; i += 10) {
        const batch = targets.slice(i, i + 10);
        const results = await Promise.all(batch.map(term => fetchSingleSimData(term)));
        results.forEach(res => {
            if (Array.isArray(res)) {
                allResults.push(...res);
            }
        });
        // Small delay between batches
        if (i + 3 < targets.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    if (allResults.length > 0) {
      return NextResponse.json(allResults);
    } else {
      return NextResponse.json({ error: "No records found for the provided inputs." });
    }

  } catch (error: any) {
    return NextResponse.json({ error: `Failed: ${error.message}` }, { status: 500 });
  }
}
