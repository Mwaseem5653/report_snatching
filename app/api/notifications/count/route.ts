import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

export const dynamic = "force-dynamic";

/**
 * 🔔 Notification Count API
 * Refactored to fetch and filter in-memory to avoid Firestore Indexing issues
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;

    if (!token) return NextResponse.json({ count: 0 });

    let decoded: any;
    try {
      decoded = jwt.verify(token, SECRET);
    } catch (err) {
      return NextResponse.json({ count: 0 });
    }

    const { role, district } = decoded;
    
    // Only certain roles see notifications
    if (!["super_admin", "admin", "officer"].includes(role)) {
        return NextResponse.json({ count: 0 });
    }

    let queryRef: any = adminDb.collection("matched_imeis");

    // 1. Apply District Filter at Database Level (Efficiency)
    if (role === "admin" || role === "officer") {
        if (Array.isArray(district)) {
            if (district.length > 0) {
                queryRef = queryRef.where("foundBy.district", "in", district);
            } else {
                return NextResponse.json({ count: 0 });
            }
        } else if (district) {
            queryRef = queryRef.where("foundBy.district", "==", district);
        } else {
            return NextResponse.json({ count: 0 });
        }
    }

    // 2. Fetch records
    const snapshot = await queryRef.get();
    let matches = snapshot.docs.map((doc: any) => doc.data());

    // 3. Apply Status Filter in-memory (Security & Reliability)
    let finalCount = 0;

    if (role === "officer") {
        // Officers only alerted for 'new' matches
        finalCount = matches.filter((m: any) => m.status === "new").length;
    } else if (role === "super_admin") {
        // Super Admin alerted for anything they haven't cleared personally
        finalCount = matches.filter((m: any) => !m.superAdminCleared).length;
    } else if (role === "admin") {
        // Admin alerted for New or Processed items they haven't cleared
        finalCount = matches.filter((m: any) => !m.adminCleared && (m.status === "new" || m.status === "processed")).length;
    }

    return NextResponse.json({ success: true, count: finalCount });
  } catch (error: any) {
    console.error("Notification Count Error:", error);
    return NextResponse.json({ count: 0 });
  }
}
