import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

export const dynamic = "force-dynamic";

/**
 * 🔔 Notification Count API (Using Neon DB)
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;

    if (!token) return NextResponse.json({ success: true, count: 0 });

    let decoded: any;
    try {
      decoded = jwt.verify(token, SECRET);
    } catch (err) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const { role, district } = decoded;
    
    // Only certain roles see notifications
    if (!["super_admin", "admin", "officer"].includes(role)) {
        return NextResponse.json({ success: true, count: 0 });
    }

    let query = sql`SELECT * FROM matched_imeis WHERE 1=1`;

    // District filter for admin & officer
    if (role === "admin" || role === "officer") {
        if (Array.isArray(district) && district.length > 0) {
            const distList = district.map((d: string) => d.toLowerCase());
            query = sql`${query} AND (
                LOWER("originalDistrict") = ANY(${distList}) 
                OR LOWER("foundBy"->>'district') = ANY(${distList})
            )`;
        } else if (typeof district === "string" && district) {
            const distLower = district.toLowerCase();
            query = sql`${query} AND (
                LOWER("originalDistrict") = ${distLower} 
                OR LOWER("foundBy"->>'district') = ${distLower}
            )`;
        } else {
            return NextResponse.json({ success: true, count: 0 });
        }
    }

    const matches = await query;

    let finalCount = 0;
    if (role === "officer") {
        // Officers only alerted for 'new' matches
        finalCount = matches.filter((m: any) => m.status === "new").length;
    } else if (role === "super_admin") {
        // Super Admin alerted for anything not cleared
        finalCount = matches.filter((m: any) => !m.superAdminCleared && m.status !== "cleared").length;
    } else if (role === "admin") {
        // Admin alerted for New or Processed items not cleared
        finalCount = matches.filter((m: any) => !m.adminCleared && (m.status === "new" || m.status === "processed")).length;
    }

    return NextResponse.json({ success: true, count: finalCount });
  } catch (error: any) {
    console.error("Notification Count Error:", error);
    return NextResponse.json({ success: true, count: 0 });
  }
}

