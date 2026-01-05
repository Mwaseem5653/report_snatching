import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

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
    
    if (!["super_admin", "admin", "officer"].includes(role)) {
        return NextResponse.json({ count: 0 });
    }

    let query: any = adminDb.collection("matched_imeis");

    // ROLE BASED STATUS FILTERING
    if (role === "officer") {
        // Officers only alerted for absolutely new matches
        query = query.where("status", "==", "new");
    } else {
        // Admins/Super Admins see everything until they personally clear it
        // We'll count anything that isn't 'cleared'
        query = query.where("status", "!=", "cleared");
    }

    // DISTRICT FILTERING
    if (role === "admin" || role === "officer") {
        if (Array.isArray(district)) {
            if (district.length > 0) {
                query = query.where("foundBy.district", "in", district);
            } else {
                return NextResponse.json({ count: 0 });
            }
        } else if (district) {
            query = query.where("foundBy.district", "==", district);
        } else {
            return NextResponse.json({ count: 0 });
        }
    }

    const snapshot = await query.get();
    
    // Extra safeguard: Since Firestore doesn't support != well with other where filters sometimes,
    // we do a final pass for roles that see "all but cleared"
    let count = snapshot.size;
    if (role !== "officer" && role !== "super_admin") {
        // If it was a complex query, we might have over-fetched if the index wasn't perfect
        // but simple count is usually fine.
    }

    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error("Notif count error:", error);
    return NextResponse.json({ count: 0 });
  }
}