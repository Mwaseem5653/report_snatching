import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";
import { logToolUsage } from "@/lib/usageLogger";

const SECRET = process.env.SESSION_JWT_SECRET!;

async function fetchCnicData(cnic: string, type: string) {
    const apiUrl = "https://api.mahisite.xyz/sindh/api.php";
    const params = new URLSearchParams({
      cnic: cnic,
      type: type,
    });

    try {
        const res = await fetch(`${apiUrl}?${params.toString()}`);
        if (!res.ok) return null;
        const data = await res.json();

        if (data.status === true && data.data && Array.isArray(data.data)) {
            return data.data.map((item: any) => ({
                registrationNumber: item.registration_no || "N/A",
                ownerName: item.owner_name || "N/A",
                fatherName: item.father_name || "N/A",
                cnic: item.cnic || "N/A",
                mobile: item.mobile || "N/A",
                address: item.address || "N/A",
                chassisNumber: item.chassis_no || "N/A",
                engineNumber: item.engine_no || "N/A",
                model: item.model || "N/A",
                vehicleType: item.vehicle_type || "N/A",
                bookNo: item.book_no || "N/A"
            }));
        }
        return null;
    } catch (e) {
        console.error("CNIC API Error:", e);
        return null;
    }
}

export async function POST(req: NextRequest) {
  try {
    const { cnic, cnics, type } = await req.json();
    const targets: string[] = cnics || (cnic ? [cnic] : []);

    if (targets.length === 0 || !type) {
      return NextResponse.json({ error: "CNIC and Type are required" }, { status: 400 });
    }

    // 🚀 Token Deduction & Usage Logging
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sessionToken")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const decoded: any = jwt.verify(token, SECRET);

        const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, targets.length);
        if (!tokenCheck.success) {
            return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
        }

        await logToolUsage(decoded, "CNIC Lookup", { targets: targets.length });
    } catch (err) {
        return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    const allResults: any[] = [];
    for (let i = 0; i < targets.length; i++) {
        const result = await fetchCnicData(targets[i].trim(), type);
        if (result && Array.isArray(result)) {
            allResults.push(...result.map((item: any) => ({ ...item, search_term: targets[i] })));
        } else if (result) {
            allResults.push({ ...result, search_term: targets[i] });
        }
    }

    if (allResults.length > 0) {
      return NextResponse.json(allResults);
    } else {
      return NextResponse.json({ error: "No records found for the provided CNIC." });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
