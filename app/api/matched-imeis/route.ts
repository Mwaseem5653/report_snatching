import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

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

    let queryRef: any = adminDb.collection("matched_imeis");

    // 1. District Boundaries
    if (role === "admin" || role === "officer") {
        if (Array.isArray(district)) {
            if (district.length > 0) queryRef = queryRef.where("foundBy.district", "in", district);
        } else if (district) {
            queryRef = queryRef.where("foundBy.district", "==", district);
        } else {
            return NextResponse.json({ matches: [] });
        }
    } else if (role !== "super_admin") {
        return NextResponse.json({ matches: [] });
    }

    const snapshot = await queryRef.get();
    let matches = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    // 2. In-Memory Filters
    
    // Status Filter (Crucial for 'unseen' inbox logic)
    if (statusFilter && statusFilter !== "all") {
        if (statusFilter === "new") {
            // "New" / "Unseen" Logic
            if (role === "super_admin") {
                matches = matches.filter((m: any) => !m.superAdminCleared);
            } else if (role === "admin") {
                // Show items not acknowledged by Admin, but ONLY if they are New or Processed.
                // This hides globally 'cleared' items from the default inbox even if Admin hasn't clicked ack.
                matches = matches.filter((m: any) => !m.adminCleared && (m.status === "new" || m.status === "processed"));
            } else {
                // Officer or others: Standard status check
                matches = matches.filter((m: any) => m.status === "new");
            }
        } 
        else if (statusFilter === "processed") {
             matches = matches.filter((m: any) => m.status === "processed");
        }
        else if (statusFilter === "cleared") {
            if (role === "super_admin") {
                matches = matches.filter((m: any) => m.superAdminCleared === true);
            } else if (role === "admin") {
                matches = matches.filter((m: any) => m.adminCleared === true);
            } else {
                matches = matches.filter((m: any) => m.status === "cleared"); // Legacy fallback
            }
        }
    }

    // Period Filter
    if (period !== "all") {
        const now = new Date();
        let limitDate = new Date();
        if (period === "15days") limitDate.setDate(now.getDate() - 15);
        else if (period === "1month") limitDate.setMonth(now.getMonth() - 1);
        else if (period === "3months") limitDate.setMonth(now.getMonth() - 3);
        else if (period === "6months") limitDate.setMonth(now.getMonth() - 6);
        else if (period === "1year") limitDate.setFullYear(now.getFullYear() - 1);
        
        const limitTime = limitDate.getTime();
        matches = matches.filter((m: any) => (m.matchedAt?._seconds ? m.matchedAt._seconds * 1000 : 0) >= limitTime);
    }

    // IMEI Search
    if (imeiSearch) {
        matches = matches.filter((m: any) => m.imei?.includes(imeiSearch));
    }

    // 3. Sorting (Newest First)
    matches.sort((a: any, b: any) => (b.matchedAt?._seconds || 0) - (a.matchedAt?._seconds || 0));

    return NextResponse.json({ success: true, matches });
  } catch (error: any) {
    console.error("GET matched-imeis error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
