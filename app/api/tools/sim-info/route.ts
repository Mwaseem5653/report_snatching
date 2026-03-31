import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";
import { logToolUsage } from "@/lib/usageLogger";

const SECRET = process.env.SESSION_JWT_SECRET!;

async function fetchSingleSimData(term: string) {
    const apiUrl = "https://simdataupdates.com/wp-admin/admin-ajax.php";
    const params = new URLSearchParams({
      action: "fetch_sim_data",
      term: term,
    });

    try {
        const res = await fetch(`${apiUrl}?${params.toString()}`, {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Referer": "https://simdataupdates.com/",
                "X-Requested-With": "XMLHttpRequest",
            },
        });

        if (!res.ok) return { error: `HTTP Error ${res.status}`, term };

        const text = await res.text();
        if (!text || text.trim().length === 0) return { error: "Blocked", term };

        const data = JSON.parse(text);
        if (data.success && data.data) {
            return data.data.map((item: any) => ({ ...item, search_term: term }));
        }
        return [];
    } catch (e: any) {
        return { error: e.message, term };
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
    for (let i = 0; i < targets.length; i += 3) {
        const batch = targets.slice(i, i + 3);
        const results = await Promise.all(batch.map(term => fetchSingleSimData(term)));
        results.forEach(res => {
            if (Array.isArray(res)) {
                allResults.push(...res);
            } else {
                // Keep track of errors if needed, or just skip
                console.error(`Lookup error for ${res.term}: ${res.error}`);
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
