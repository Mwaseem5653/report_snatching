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

    const { role, district: requesterDistrict, ps: requesterPs } = decoded;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const requestedDistrict = searchParams.get("district");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    
    let ps = searchParams.get("ps")?.toLowerCase();

    if (role === "ps_user") {
        if (!requesterPs) return NextResponse.json({ success: true, applications: [] });
        ps = requesterPs.toLowerCase();
    }

    let period = searchParams.get("period");
    if (!period && role === "ps_user") period = "15days";
    else if (!period) period = "all";
    
    const search = searchParams.get("search")?.toLowerCase();
    let queryRef: any = adminDb.collection("applications");

    if (fromDate && toDate) {
        const start = admin.firestore.Timestamp.fromDate(new Date(`${fromDate}T00:00:00`));
        const end = admin.firestore.Timestamp.fromDate(new Date(`${toDate}T23:59:59`));
        queryRef = queryRef.where("createdAt", ">=", start).where("createdAt", "<=", end);
    }

    const hasAdvancedAccess = decoded.permissions?.advanced_reports === true;

    if ((role === "admin" || role === "officer") && !hasAdvancedAccess) {
        if (Array.isArray(requesterDistrict)) {
            if (requestedDistrict && requestedDistrict !== "all") {
                if (requesterDistrict.includes(requestedDistrict)) {
                    queryRef = queryRef.where("district", "==", requestedDistrict);
                } else {
                    return NextResponse.json({ error: "Access denied" }, { status: 403 });
                }
            } else {
                if (requesterDistrict.length > 0) queryRef = queryRef.where("district", "in", requesterDistrict);
                else return NextResponse.json({ success: true, applications: [] });
            }
        } else if (requesterDistrict) {
            queryRef = queryRef.where("district", "==", requesterDistrict);
        } else {
            return NextResponse.json({ success: true, applications: [] });
        }
    } else if (role === "super_admin" || hasAdvancedAccess) {
        if (requestedDistrict && requestedDistrict !== "all") {
            queryRef = queryRef.where("district", "==", requestedDistrict);
        }
    } else if (role === "ps_user") {
        if (requesterPs) queryRef = queryRef.where("ps", "==", requesterPs);
        else return NextResponse.json({ success: true, applications: [] });
    }

    if (status && status !== "none" && status !== "all") {
        if (status.includes(",")) {
            const statusArray = status.split(",");
            queryRef = queryRef.where("status", "in", statusArray);
        } else {
            queryRef = queryRef.where("status", "==", status);
        }
    }

    const snap = await queryRef.get();
    let applications = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // 3. Robust In-Memory Period Filter
    if (period && period !== "all" && period !== "custom") {
      const now = new Date();
      applications = applications.filter((app: any) => {
        if (!app.createdAt) return false;
        
        // Convert Firestore Timestamp/Seconds to JS Date
        const appDate = app.createdAt.toDate ? app.createdAt.toDate() : (app.createdAt.seconds ? new Date(app.createdAt.seconds * 1000) : new Date(app.createdAt));
        
        // Today comparison: UTC Date (Day/Month/Year)
        if (period === "today") {
            return (
                appDate.getUTCDate() === now.getUTCDate() &&
                appDate.getUTCMonth() === now.getUTCMonth() &&
                appDate.getUTCFullYear() === now.getUTCFullYear()
            );
        }

        // Other periods
        let limitDate = new Date();
        if (period === "15days") limitDate.setDate(now.getDate() - 15);
        else if (period === "1month") limitDate.setMonth(now.getMonth() - 1);
        else if (period === "3months") limitDate.setMonth(now.getMonth() - 3);
        else if (period === "6months") limitDate.setMonth(now.getMonth() - 6);
        else if (period === "1year") limitDate.setFullYear(now.getFullYear() - 1);
        
        return appDate >= limitDate;
      });
    }

    if (search) {
      applications = applications.filter((app: any) => 
        app.applicantName?.toLowerCase().includes(search) ||
        app.cnic?.includes(search) ||
        app.allImeis?.some((imei: string) => imei.includes(search)) ||
        app.imei1?.includes(search)
      );
    }

    if (ps) {
      applications = applications.filter((app: any) => 
        app.ps?.toLowerCase().includes(ps)
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

    let allImeis: string[] = [];
    if (body.devices && Array.isArray(body.devices)) {
        body.devices.forEach((d: any) => {
            if (d.imei1) allImeis.push(d.imei1);
            if (d.imei2) allImeis.push(d.imei2);
        });
    } else if (body.imei1) {
        allImeis.push(body.imei1);
        if (body.imei2) allImeis.push(body.imei2);
    }

    if (allImeis.length > 0) {
        const duplicateCheck = await appsRef.where("allImeis", "array-contains-any", allImeis).limit(1).get();
        if (!duplicateCheck.empty) {
            return NextResponse.json({ success: false, message: "One or more IMEI numbers already exist in the system." }, { status: 400 });
        }
    }

    let finalOffenceDate: any = body.offenceDate || null;
    if (body.offenceDate && typeof body.offenceDate === "string") {
        const d = new Date(body.offenceDate);
        if (!isNaN(d.getTime())) {
            finalOffenceDate = admin.firestore.Timestamp.fromDate(d);
        }
    }

    const newApp = { 
        ...body, 
        allImeis: allImeis, 
        offenceDate: finalOffenceDate,
        status: "pending", 
        createdAt: admin.firestore.Timestamp.now() 
    };
    const docRef = await appsRef.add(newApp);
    return NextResponse.json({ success: true, id: docRef.id });
  } catch (err: any) {
    console.error("POST /api/applications error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

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

    if (status === "complete" && currentStatus === "processed") {
        if (appData.processedBy?.uid !== currentUser.uid) {
            return NextResponse.json({ error: "Only the processing officer can mark this case as complete." }, { status: 403 });
        }

        if (!comments || comments.trim().length < 5) {
            return NextResponse.json({ error: "Final remarks/comments are mandatory to complete the case." }, { status: 400 });
        }

        await appRef.update({
            status: "complete",
            comments: comments,
            completedAt: admin.firestore.Timestamp.now(),
            completedBy: {
                uid: currentUser.uid,
                name: currentUser.name,
                mobile: currentUser.mobile,
                role: currentUser.role,
                buckle: currentUser.buckle || "N/A"
            }
        });
        return NextResponse.json({ success: true, message: "Application marked as complete" });
    }

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

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded: any;
    try { 
      decoded = jwt.verify(token, SECRET); 
    } catch (err) { 
      return NextResponse.json({ error: "Invalid session" }, { status: 401 }); 
    }

    if (decoded.role !== "super_admin") {
      return NextResponse.json({ error: "Only Super Admin can delete applications." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Application ID required" }, { status: 400 });

    const appRef = adminDb.collection("applications").doc(id);
    const appDoc = await appRef.get();

    if (!appDoc.exists) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    await appRef.delete();

    return NextResponse.json({ success: true, message: "Application deleted successfully" });

  } catch (err: any) {
    console.error("DELETE /api/applications error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
