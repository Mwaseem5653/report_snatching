import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { numbers } = await req.json();

    if (!numbers || !Array.isArray(numbers)) {
      return NextResponse.json({ error: "Invalid numbers provided" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded: any = jwt.verify(token, SECRET);

    // Deduct a flat 5 tokens for operator identification
    const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, 5);
    if (!tokenCheck.success) {
        return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
    }

    const results = await Promise.all(
      numbers.map(async (num: string) => {
        let cleanNum = num.trim().replace(/\D/g, "");
        if (cleanNum.startsWith("03")) cleanNum = "92" + cleanNum.substring(1);
        
        try {
          const res = await fetch(`https://easyload.com.pk/dingconnect.php?action=GetProviders&accountNumber=${cleanNum}`);
          const data = await res.json();
          const operator = data?.Items?.[0]?.Name || "Not Found";
          return { number: num, operator };
        } catch (e) {
          return { number: num, operator: "Error" };
        }
      })
    );

    // Generate Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Operator Results");
    sheet.columns = [
      { header: "Phone Number", key: "number", width: 20 },
      { header: "Operator", key: "operator", width: 25 },
    ];
    sheet.addRows(results);
    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="operator_results.xlsx"`,
        "X-Results": JSON.stringify(results), // Passing metadata in headers for UI display
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
