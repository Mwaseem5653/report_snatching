import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";
import { logToolUsage } from "@/lib/usageLogger";

const SECRET = process.env.SESSION_JWT_SECRET!;

async function fetchSingleVehicleData(reg: string, type: string) {
    const apiUrl = "https://api.mahisite.xyz/sindh/api.php";
    const params = new URLSearchParams({
      reg: reg,
      type: type,
    });

    try {
        const res = await fetch(`${apiUrl}?${params.toString()}`);
        if (!res.ok) return null;
        const data = await res.json();

        if (data.status === true && data.data && Array.isArray(data.data)) {
            return data.data.map((info: any) => ({
                registrationNumber: info.registration_no || "N/A",
                ownerName: info.owner_name || "N/A",
                ownerCNIC: info.cnic || "N/A",
                ownerAddress: info.address || "N/A",
                registrationDate: info.registration_date || "N/A",
                engineNumber: info.engine_no || "N/A",
                chassisNumber: info.chassis_no || "N/A",
                model: info.model || "N/A",
                vehicleType: info.vehicle_type || "N/A",
                bookNo: info.book_no || "N/A",
                search_term: reg
            }));
        }
        return null;
    } catch (e) {
        return null;
    }
}

export async function POST(req: NextRequest) {
  try {
    const { reg_no, reg_nos, category } = await req.json();
    const targets: string[] = reg_nos || (reg_no ? [reg_no] : []);

    if (targets.length === 0 || !category) {
      return NextResponse.json({ error: "Reg Nos and Category are required" }, { status: 400 });
    }

    // 🚀 Token Deduction & Usage Logging
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sessionToken")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const decoded: any = jwt.verify(token, SECRET);

        const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, targets.length * 30);
        if (!tokenCheck.success) {
            return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
        }

        await logToolUsage(decoded, "Vehicle Lookup", { targets: targets.length });
    } catch (err) {
        return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    const allResults: any[] = [];
    // Process in batches
    for (let i = 0; i < targets.length; i += 5) {
        const batch = targets.slice(i, i + 5);
        const results = await Promise.all(batch.map(term => fetchSingleVehicleData(term.trim(), category)));
        results.forEach(res => {
            if (Array.isArray(res)) {
                allResults.push(...res);
            } else if (res) {
                allResults.push(res);
            }
        });
        if (i + 5 < targets.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    if (allResults.length > 0) {
      return NextResponse.json(allResults);
    } else {
      return NextResponse.json({ error: "No vehicle records found for the provided registration numbers." });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
