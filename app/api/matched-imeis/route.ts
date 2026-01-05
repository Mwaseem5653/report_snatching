import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, SECRET);
    } catch (err) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { role, district } = decoded;
    const { searchParams } = new URL(req.url);
    const imeiSearch = searchParams.get("imei")?.trim();
    const period = searchParams.get("period"); 

    let queryRef: any = adminDb.collection("matched_imeis");

    // 1. Role-Based District Filtering
    if (role === "admin" || role === "officer") {
        if (Array.isArray(district)) {
            if (district.length > 0) {
                queryRef = queryRef.where("foundBy.district", "in", district);
            }
        } else if (district) {
            queryRef = queryRef.where("foundBy.district", "==", district);
        } else {
            return NextResponse.json({ matches: [] });
        }
    } else if (role !== "super_admin") {
        return NextResponse.json({ matches: [] });
    }

    // 2. Fetch Data
    const snapshot = await queryRef.get();
    let matches = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 3. APPLY FILTERS (In-memory for security and accuracy)
    
    // 🛑 Rule 1: Exclude matches found by Super Admin, Admin, and Officer (Per User Request)
    const restrictedRoles = ["super_admin", "admin", "officer"];
    matches = matches.filter((m: any) => !restrictedRoles.includes(m.foundBy?.role));

    // 🛑 Rule 2: Ensure Unique IMEIs (Fixes the 150% issue)
    const uniqueMatches: Record<string, any> = {};
    matches.forEach((m: any) => {
        if (!m.imei) return;
        // Keep the latest match if multiple exist
        if (!uniqueMatches[m.imei] || (m.matchedAt?._seconds > uniqueMatches[m.imei].matchedAt?._seconds)) {
            uniqueMatches[m.imei] = m;
        }
    });
    matches = Object.values(uniqueMatches);

    // Apply IMEI search
    if (imeiSearch) {
        matches = matches.filter((m: any) => m.imei?.includes(imeiSearch));
    }

    // Apply Period filter
    if (period && period !== "all") {
        const now = new Date();
        let limitDate = new Date();
        if (period === "15days") limitDate.setDate(now.getDate() - 15);
        else if (period === "1month") limitDate.setMonth(now.getMonth() - 1);
        else if (period === "3months") limitDate.setMonth(now.getMonth() - 3);
        
        const limitTime = limitDate.getTime();
        matches = matches.filter((m: any) => {
            const matchTime = m.matchedAt?._seconds ? m.matchedAt._seconds * 1000 : 0;
            return matchTime >= limitTime;
        });
    }

    // 4. Manual Sorting (Newest first)
    matches.sort((a: any, b: any) => {
        const timeA = a.matchedAt?._seconds || 0;
        const timeB = b.matchedAt?._seconds || 0;
        return timeB - timeA;
    });

    return NextResponse.json({ success: true, matches });
  } catch (error: any) {
    console.error("GET matched-imeis error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}