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
            if (!res.ok) return null;
            const text = await res.text();
            return JSON.parse(text);
        } catch (e) {
            return null;
        }
    };

    try {
        /* 
        // --- OLD LOGIC (Primary API) ---
        let data = await fetchFromApi(API_URL, cleanNumber);

        // If primary fails or returns error, try fallback
        if (!data || data.error === "Invalid contacts") {
            data = await fetchFromApi(CHECK_URL, cleanNumber);
        }
        */

        // --- NEW LOGIC (Direct Fallback) ---
        let data = await fetchFromApi(CHECK_URL, cleanNumber);

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

            // 2. Fallback for flat structure (if no indexed items found)
            if (results.length === 0 && (data.name || data.Name || data.NAME)) {
                results.push({
                    name: data.name || data.Name || data.NAME || "N/A",
                    number: data.number || data.Number || term,
                    cnic: data.cnic || data.Cnic || data.CNIC || "N/A",
                    address: data.address || data.Address || data.ADDRESS || "N/A",
                    search_term: term
                });
            }

            return results;
        }
        return [];
    } catch (e: any) {
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

        const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, targets.length);
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
