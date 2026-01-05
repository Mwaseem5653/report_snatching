import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";
import * as admin from "firebase-admin";

// ---------------- ADD APPLICATION ----------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 🛑 Duplicate IMEI check
    const appsRef = adminDb.collection("applications");
    const snapshot = await appsRef.where("imei1", "==", body.imei1).get();
    
    if (!snapshot.empty) {
      return NextResponse.json(
        { success: false, message: "IMEI already exists" },
        { status: 400 }
      );
    }

    // ✅ We are NOT uploading files here now — just saving the URLs
    const pictureUrl = body.pictureUrl || null;
    const attachmentUrl = body.attachmentUrl || null;

    const newApp = {
      applicantName: body.applicantName,
      applicantMobile: body.applicantMobile,
      cnic: body.cnic ?? "",
      city: body.city,
      district: body.district,
      ps: body.ps,
      mobileModel: body.mobileModel,
      imei1: body.imei1,
      imei2: body.imei2 ?? "",
      crimeHead: body.crimeHead,
      pictureUrl,
      attachmentUrl,
      offenceDate: body.offenceDate,
      offenceTime: body.offenceTime,
      offenceAddress: body.offenceAddress,
      note: body.note ?? "",
      otherLostProperty: body.otherLostProperty ?? "",
      status: "pending",
      createdAt: admin.firestore.Timestamp.now(),
    };

    const docRef = await appsRef.add(newApp);

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (err: any) {
    console.error("POST /api/applications error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// ---------------- GET APPLICATIONS ----------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const city = searchParams.get("city");
    const district = searchParams.get("district");
    const ps = searchParams.get("ps");
    const period = searchParams.get("period"); // 15days, 1month, etc.
    const search = searchParams.get("search")?.toLowerCase();

    let queryRef: any = adminDb.collection("applications");

    // Apply basic filters directly in Firestore
    if (status && status !== "none") queryRef = queryRef.where("status", "==", status);
    if (city) queryRef = queryRef.where("city", "==", city);
    if (district) queryRef = queryRef.where("district", "==", district);
    if (ps) queryRef = queryRef.where("ps", "==", ps);

    // Fetch documents
    const snap = await queryRef.get();
    let applications = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // Apply search filter in-memory (for name, email, or IMEI)
    if (search) {
      applications = applications.filter((app: any) => {
        return (
          app.applicantName?.toLowerCase().includes(search) ||
          app.applicantMobile?.includes(search) ||
          app.imei1?.includes(search) ||
          app.imei2?.includes(search) ||
          app.cnic?.includes(search)
        );
      });
    }

    // Apply Date Filtering in-memory (easier than complex Firestore indexing for mixed queries)
    if (period && period !== "all") {
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

    // Sort by createdAt desc
    applications.sort((a: any, b: any) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
    });

    return NextResponse.json({ success: true, applications });
  } catch (err: any) {
    console.error("GET /api/applications error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ---------------- UPDATE APPLICATION ----------------
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, message: "Application id is required" },
        { status: 400 }
      );
    }

    const { id, ...updateData } = body;
    await adminDb.collection("applications").doc(id).update(updateData);

    return NextResponse.json({ success: true, message: "Application updated" });
  } catch (err: any) {
    console.error("PUT /api/applications error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
