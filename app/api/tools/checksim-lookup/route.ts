import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { checkAndDeductTokens } from "@/lib/tokenHelper";
import { streamChecksimLookup } from "@/lib/checksimLookup";

const SECRET = process.env.SESSION_JWT_SECRET!;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

    // 10 tokens per number deduction
    const tokenCheck = await checkAndDeductTokens(decoded.uid, decoded.role, numbers.length * 10);
    if (!tokenCheck.success) {
      return NextResponse.json({ error: tokenCheck.error }, { status: 403 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const result of streamChecksimLookup(numbers)) {
            controller.enqueue(encoder.encode(JSON.stringify(result) + "\n"));
          }
        } catch (err: any) {
          console.error("Checksim stream generation error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Checksim Lookup Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
