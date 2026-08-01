import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";

const SECRET = process.env.SESSION_JWT_SECRET!;

export const dynamic = "force-dynamic";

// Deduct tokens for CDR standard (offline) identification
// 5 tokens per number, super_admin bypasses
export async function POST(req: NextRequest) {
  try {
    const { count } = await req.json();

    if (!count || typeof count !== "number" || count < 1) {
      return NextResponse.json({ error: "Invalid count provided" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, SECRET);

    // 5 tokens per number
    const tokensNeeded = count * 5;

    const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, tokensNeeded);
    if (!tokenCheck.success) {
      return NextResponse.json(
        { error: tokenCheck.error, currentBalance: 0, requiredTokens: tokensNeeded },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      deducted: tokensNeeded,
      newBalance: tokenCheck.newBalance,
    });
  } catch (error: any) {
    console.error("CDR Token Deduct Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
