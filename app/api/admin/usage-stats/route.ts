import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";
import * as admin from "firebase-admin";
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
        const role = searchParams.get("role");
        const tool = searchParams.get("tool");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        let query: any = adminDb.collection("tool_usage_logs");

        // Period Filtering
        const now = new Date();
        if (period === "today") {
            query = query.where("date", "==", now.toISOString().split('T')[0]);
        } else if (period === "custom" && startDate && endDate) {
            const start = admin.firestore.Timestamp.fromDate(new Date(startDate));
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            const endTimestamp = admin.firestore.Timestamp.fromDate(end);
            query = query.where("timestamp", ">=", start).where("timestamp", "<=", endTimestamp);
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
            const details = log.details || {};
            
            // Standard Increment: Use fileCount or targets if available, otherwise default to 1
            const increment = details.fileCount || details.targets || 1;
            
            // 🚀 Normalize tool names if they were combined before
            let finalToolName = toolName;
            if (toolName === "Eyecon/Info Lookup") {
                // If it has 'targets' or 'phone_numbers' metadata, it was likely SIM Info
                if (details.targets || details.phone_numbers) finalToolName = "SIM Info Lookup";
                else finalToolName = "Eyecon Lookup";
            }

            aggregation[key].tools[finalToolName] = (aggregation[key].tools[finalToolName] || 0) + increment;

            // 🚀 Special Breakdown for Excel Analyzer: Count Lookups separately if enabled
            if (toolName === "Excel Analyzer") {
                if (details.lookupCount > 0) {
                    aggregation[key].tools["SIM Info Lookup"] = (aggregation[key].tools["SIM Info Lookup"] || 0) + details.lookupCount;
                }
                if (details.eyeconCount > 0) {
                    aggregation[key].tools["Eyecon Lookup"] = (aggregation[key].tools["Eyecon Lookup"] || 0) + details.eyeconCount;
                }
            }
        });

        const result = Object.values(aggregation);

        return NextResponse.json({ success: true, stats: result });

    } catch (err: any) {
        console.error("Usage Stats API error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
