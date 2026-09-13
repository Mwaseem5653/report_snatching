import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded: any;
    try { decoded = jwt.verify(token, SECRET); } catch (err) { return NextResponse.json({ error: "Invalid session" }, { status: 401 }); }

    const { role, district } = decoded;
    const { searchParams } = new URL(req.url);
    const imeiSearch = searchParams.get("imei")?.trim();
    const period = searchParams.get("period") || "all"; 
    const statusFilter = searchParams.get("status"); 

    let query = sql`SELECT * FROM matched_imeis WHERE 1=1`;

    // 1. District Boundaries
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
            return NextResponse.json({ success: true, matches: [] });
        }
    } else if (role !== "super_admin") {
        return NextResponse.json({ success: true, matches: [] });
    }

    if (period === "15days") {
        query = sql`${query} AND "matchedAt" >= NOW() - interval '15 days'`;
    } else if (period === "1month") {
        query = sql`${query} AND "matchedAt" >= NOW() - interval '1 month'`;
    } else if (period === "3months") {
        query = sql`${query} AND "matchedAt" >= NOW() - interval '3 months'`;
    } else if (period === "6months") {
        query = sql`${query} AND "matchedAt" >= NOW() - interval '6 months'`;
    } else if (period === "1year") {
        query = sql`${query} AND "matchedAt" >= NOW() - interval '1 year'`;
    }

    if (imeiSearch) {
        query = sql`${query} AND "imei" ILIKE ${'%' + imeiSearch + '%'}`;
    }

    let matches = await query;

    // Status Filter (Crucial for 'unseen' inbox logic)
    if (statusFilter && statusFilter !== "all") {
        if (statusFilter === "new") {
            matches = matches.filter((m: any) => m.status !== "cleared");
        } else if (statusFilter === "processed") {
            matches = matches.filter((m: any) => m.status === "processed");
        } else if (statusFilter === "cleared") {
            matches = matches.filter((m: any) => m.status === "cleared" || m.superAdminCleared === true || m.adminCleared === true);
        }
    }


    // Sorting (Newest First)
    matches.sort((a: any, b: any) => new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime());

    return NextResponse.json({ success: true, matches });
  } catch (error: any) {
    console.error("GET matched-imeis error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, SECRET);
    if (decoded.role !== "super_admin") {
      return NextResponse.json({ error: "Only Super Admin can delete notifications" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Notification ID required" }, { status: 400 });

    await sql`DELETE FROM matched_imeis WHERE "id" = ${id}`;

    return NextResponse.json({ success: true, message: "Notification deleted successfully" });
  } catch (error: any) {
    console.error("DELETE matched-imeis error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

