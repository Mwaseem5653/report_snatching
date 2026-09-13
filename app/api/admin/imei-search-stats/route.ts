import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sessionToken")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decoded: any = jwt.verify(token, SECRET);
        if (decoded.role !== "super_admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const period = searchParams.get("period") || "today";
        const fromDate = searchParams.get("fromDate");
        const toDate = searchParams.get("toDate");
        const role = searchParams.get("role");

        let query = sql`SELECT * FROM imei_search_logs WHERE 1=1`;

        // Period Filtering
        if (period === "today") {
            query = sql`${query} AND ("date" >= CURRENT_DATE - interval '1 day' OR "timestamp" >= NOW() - interval '24 hours')`;
        } else if (period === "custom") {
            if (fromDate && toDate) {
                query = sql`${query} AND "timestamp" >= ${fromDate}::timestamp AND "timestamp" <= ${toDate}::timestamp + interval '23 hours 59 minutes 59 seconds'`;
            } else if (fromDate) {
                query = sql`${query} AND "timestamp" >= ${fromDate}::timestamp`;
            } else if (toDate) {
                query = sql`${query} AND "timestamp" <= ${toDate}::timestamp + interval '23 hours 59 minutes 59 seconds'`;
            }
        } else if (period === "15days") {
            query = sql`${query} AND "timestamp" >= NOW() - interval '15 days'`;
        } else if (period === "1month") {
            query = sql`${query} AND "timestamp" >= NOW() - interval '1 month'`;
        } else if (period === "3months") {
            query = sql`${query} AND "timestamp" >= NOW() - interval '3 months'`;
        } else if (period === "6months") {
            query = sql`${query} AND "timestamp" >= NOW() - interval '6 months'`;
        } else if (period === "1year") {
            query = sql`${query} AND "timestamp" >= NOW() - interval '1 year'`;
        }

        if (role && role !== "all") {
            query = sql`${query} AND "userRole" = ${role}`;
        }

        const logs = await query;

        // Aggregate by User
        const aggregation: Record<string, any> = {};

        logs.forEach((log: any) => {
            const key = log.userId;
            if (!aggregation[key]) {
                aggregation[key] = {
                    name: log.userName,
                    email: log.userEmail,
                    role: log.userRole,
                    ps: log.userPs || "N/A",
                    totalChecked: 0,
                    totalMatched: 0,
                    totalNotMatched: 0
                };
            }
            
            aggregation[key].totalChecked++;
            if (log.isMatch) {
                aggregation[key].totalMatched++;
            } else {
                aggregation[key].totalNotMatched++;
            }
        });

        const result = Object.values(aggregation);

        return NextResponse.json({ success: true, stats: result });

    } catch (err: any) {
        console.error("IMEI Stats API error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

