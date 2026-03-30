import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";
import * as admin from "firebase-admin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

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
        const role = searchParams.get("role");
        const tool = searchParams.get("tool");

        let query: any = adminDb.collection("tool_usage_logs");

        // Period Filtering
        const now = new Date();
        if (period === "today") {
            query = query.where("date", "==", now.toISOString().split('T')[0]);
        } else if (period !== "all") {
            let limitDate = new Date();
            if (period === "15days") limitDate.setDate(now.getDate() - 15);
            else if (period === "1month") limitDate.setMonth(now.getMonth() - 1);
            else if (period === "3months") limitDate.setMonth(now.getMonth() - 3);
            
            const startTimestamp = admin.firestore.Timestamp.fromDate(limitDate);
            query = query.where("timestamp", ">=", startTimestamp);
        }

        if (role && role !== "all") {
            query = query.where("userRole", "==", role);
        }
        if (tool && tool !== "all") {
            query = query.where("toolName", "==", tool);
        }

        const snapshot = await query.get();
        const logs = snapshot.docs.map((doc: any) => doc.data());

        // Aggregate by User
        const aggregation: Record<string, any> = {};

        logs.forEach((log: any) => {
            const key = log.userId;
            if (!aggregation[key]) {
                aggregation[key] = {
                    name: log.userName,
                    email: log.userEmail,
                    role: log.userRole,
                    tools: {}
                };
            }
            const toolName = log.toolName;
            aggregation[key].tools[toolName] = (aggregation[key].tools[toolName] || 0) + 1;
        });

        const result = Object.values(aggregation);

        return NextResponse.json({ success: true, stats: result });

    } catch (err: any) {
        console.error("Usage Stats API error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
