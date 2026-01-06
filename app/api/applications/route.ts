import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import * as admin from "firebase-admin";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded: any;
    try { decoded = jwt.verify(token, SECRET); } catch (err) { return NextResponse.json({ error: "Invalid session" }, { status: 401 }); }

    const { role, district: requesterDistrict } = decoded;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const requestedDistrict = searchParams.get("district");
    let period = searchParams.get("period");
    if (!period && role === "ps_user") period = "15days";
    else if (!period) period = "all";
    
    const search = searchParams.get("search")?.toLowerCase();

    let queryRef: any = adminDb.collection("applications");

    // 1. Security: District Boundaries
    if (role === "admin" || role === "officer") {
        if (Array.isArray(requesterDistrict)) {
            if (requestedDistrict && requestedDistrict !== "all") {
                if (requesterDistrict.includes(requestedDistrict)) {
                    queryRef = queryRef.where("district", "==", requestedDistrict);
                } else {
                    return NextResponse.json({ error: "Access denied" }, { status: 403 });
                }
            } else {
                if (requesterDistrict.length > 0) queryRef = queryRef.where("district", "in", requesterDistrict);
                else return NextResponse.json({ applications: [] });
            }
        } else if (requesterDistrict) {
            queryRef = queryRef.where("district", "==", requesterDistrict);
        } else {
            return NextResponse.json({ applications: [] });
        }
    } else if (role === "super_admin" && requestedDistrict && requestedDistrict !== "all") {
        queryRef = queryRef.where("district", "==", requestedDistrict);
    }

    // 2. Status Filter
    if (status && status !== "none" && status !== "all") queryRef = queryRef.where("status", "==", status);

    const snap = await queryRef.get();
    let applications = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // 3. In-Memory Filters
    if (period !== "all") {
      const now = new Date();
      let limitDate = new Date();
      if (period === "15days") limitDate.setDate(now.getDate() - 15);
      else if (period === "1month") limitDate.setMonth(now.getMonth() - 1);
      else if (period === "3months") limitDate.setMonth(now.getMonth() - 3);
      else if (period === "6months") limitDate.setMonth(now.getMonth() - 6);
      else if (period === "1year") limitDate.setFullYear(now.getFullYear() - 1);

      const limitTime = limitDate.getTime();
      applications = applications.filter((app: any) => {
        const createdTime = app.createdAt?.toMillis ? app.createdAt.toMillis() : 0;
        return createdTime >= limitTime;
      });
    }

    if (search) {
      applications = applications.filter((app: any) => 
        app.applicantName?.toLowerCase().includes(search) ||
        app.imei1?.includes(search) ||
        app.cnic?.includes(search)
      );
    }

    applications.sort((a: any, b: any) => (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0));

    return NextResponse.json({ success: true, applications });
  } catch (error: any) {
    console.error("GET /api/applications error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const appsRef = adminDb.collection("applications");
    const snapshot = await appsRef.where("imei1", "==", body.imei1).get();
    if (!snapshot.empty) return NextResponse.json({ success: false, message: "IMEI already exists" }, { status: 400 });

    const newApp = { ...body, status: "pending", createdAt: admin.firestore.Timestamp.now() };
    const docRef = await appsRef.add(newApp);
    return NextResponse.json({ success: true, id: docRef.id });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// 🚀 UPDATED: Secure Application Processing Logic
export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUser: any = jwt.verify(token, SECRET);
    const body = await req.json();
    const { id, status, comments } = body;

    if (!id) return NextResponse.json({ error: "Application ID required" }, { status: 400 });

    const appRef = adminDb.collection("applications").doc(id);
    const appDoc = await appRef.get();

    if (!appDoc.exists) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const appData: any = appDoc.data();
    const currentStatus = appData.status;

    // 1. Move from PENDING to PROCESSED
    if (status === "processed" && currentStatus === "pending") {
        await appRef.update({
            status: "processed",
            processedBy: {
                uid: currentUser.uid,
                name: currentUser.name,
                mobile: currentUser.mobile,
                role: currentUser.role,
                buckle: currentUser.buckle || "N/A",
                at: admin.firestore.Timestamp.now()
            }
        });
        return NextResponse.json({ success: true, message: "Application marked as processed" });
    }

    // 2. Move from PROCESSED to COMPLETE
    if (status === "complete" && currentStatus === "processed") {
        // 🔒 Verify: Only the SAME officer can complete the case
        if (appData.processedBy?.uid !== currentUser.uid) {
            return NextResponse.json({ error: "Only the processing officer can mark this case as complete." }, { status: 403 });
        }

        // 🔒 Verify: Remarks (comments) are mandatory
        if (!comments || comments.trim().length < 5) {
            return NextResponse.json({ error: "Final remarks/comments are mandatory to complete the case." }, { status: 400 });
        }

        await appRef.update({
            status: "complete",
            comments: comments,
            completedAt: admin.firestore.Timestamp.now()
        });
        return NextResponse.json({ success: true, message: "Application marked as complete" });
    }

    // 3. Fallback for other role updates (Admin/Super Admin) if needed
    // Allow Admins to override or update other metadata
    if (currentUser.role === "admin" || currentUser.role === "super_admin") {
        const { id, ...updates } = body;
        await appRef.update(updates);
        return NextResponse.json({ success: true, message: "Application updated by Admin" });
    }

    return NextResponse.json({ error: "Invalid status transition or insufficient permissions." }, { status: 400 });

  } catch (err: any) {
    console.error("PUT /api/applications error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
