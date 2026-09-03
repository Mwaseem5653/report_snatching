import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";

const SECRET = process.env.SESSION_JWT_SECRET!;

export const dynamic = "force-dynamic";

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

    // 20 tokens per number for live API identification
    const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, numbers.length * 20);
    if (!tokenCheck.success) {
        return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
    }

    const results: { number: string; operator: string }[] = [];
    const batchSize = 10;

    for (let i = 0; i < numbers.length; i += batchSize) {
      const batch = numbers.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (num: string) => {
          let cleanNum = num.trim().replace(/\D/g, "");

          // Standardize to 923XXXXXXXXX format
          if (cleanNum.length >= 10) {
            cleanNum = "92" + cleanNum.slice(-10);
          }

          try {
            const res = await fetch(`https://easyload.com.pk/dingconnect.php?action=GetProviders&accountNumber=${cleanNum}`, { cache: "no-store" });
            const data = await res.json();
            const operator = data?.Items?.[0]?.Name || "Not Found";
            return { number: num, operator };
          } catch (e) {
            return { number: num, operator: "API Error" };
          }
        })
      );

      results.push(...batchResults);

      // ⏳ 1 second delay after each batch (except the last one)
      if (i + batchSize < numbers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("PTA Lookup Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
