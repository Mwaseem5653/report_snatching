// app/api/auth/verify/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function GET() {
  try {
    if (!SECRET) throw new Error("Missing SESSION_JWT_SECRET");

    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const payload = jwt.verify(token, SECRET) as Record<string, any>;

    // safer response – don’t expose full payload
    const { uid, email, role } = payload;

    return NextResponse.json(
      {
        authenticated: true,
        user: { uid, email, role },
      },
      { status: 200 }
    );
  } catch (err: any) {
    const reason = err?.name === "TokenExpiredError" ? "expired" : "invalid";
    console.warn("verify token failed:", err.message || err);
    return NextResponse.json({ authenticated: false, reason }, { status: 401 });
  }
}
