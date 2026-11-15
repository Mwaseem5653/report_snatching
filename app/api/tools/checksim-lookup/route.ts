import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";
import { runChecksimLookup } from "@/lib/checksimLookup";

const SECRET = process.env.SESSION_JWT_SECRET!;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Simple in-memory cooldown tracking per user (5 minutes = 300,000 ms)
const userCooldowns = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const { numbers } = await req.json();

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: "Invalid numbers provided" }, { status: 400 });
    }

    // Max 20 numbers per request
    if (numbers.length > 20) {
      return NextResponse.json({ error: "Max 20 numbers allowed per request for Checksim API." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded: any = jwt.verify(token, SECRET);

    // Verify user is super_admin
    if (decoded.role !== "super_admin") {
      return NextResponse.json({ error: "Access denied. Checksim Live API is restricted to Super Admins only." }, { status: 403 });
    }

    // Check 5-minute break / cooldown (300,000 ms)
    const lastRun = userCooldowns.get(decoded.uid) || 0;
    const now = Date.now();
    const cooldownTime = 5 * 60 * 500;
    if (now - lastRun < cooldownTime) {
      const remainingSecs = Math.ceil((cooldownTime - (now - lastRun)) / 1000);
      const remainingMins = Math.ceil(remainingSecs / 60);
      return NextResponse.json({ 
        error: `Rate limit / Break active. Please wait ${remainingMins} Minutes` 
      }, { status: 429 });
    }

    // 10 tokens per number deduction
    const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, numbers.length * 10);
    if (!tokenCheck.success) {
      return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
    }

    const results = await runChecksimLookup(numbers);

    // Update cooldown timestamp
    userCooldowns.set(decoded.uid, Date.now());

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Checksim Lookup Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
