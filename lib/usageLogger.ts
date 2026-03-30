import { adminDb } from "@/firebaseAdmin";
import * as admin from "firebase-admin";

export async function logToolUsage(user: any, toolName: string, details: any = {}) {
    if (!user || !user.uid) return;

    try {
        await adminDb.collection("tool_usage_logs").add({
            userId: user.uid,
            userName: user.name || "Unknown",
            userEmail: user.email || "Unknown",
            userRole: user.role || "Unknown",
            toolName: toolName,
            details: details,
            timestamp: admin.firestore.Timestamp.now(),
            date: new Date().toISOString().split('T')[0] // For easier filtering by day
        });
    } catch (err) {
        console.error("Failed to log tool usage:", err);
    }
}
