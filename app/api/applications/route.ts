import { NextRequest, NextResponse } from "next/server";
import { db, storage } from "@/firebaseconfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ---------------- ADD APPLICATION ----------------
// ---------------- ADD APPLICATION ----------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 🛑 Duplicate IMEI check
    const appsRef = collection(db, "applications");
    const q = query(appsRef, where("imei1", "==", body.imei1));
    const snap = await getDocs(q);
    if (!snap.empty) {
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
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(appsRef, newApp);

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

    let appsRef = collection(db, "applications");
    let conditions: any[] = [];

    if (status) conditions.push(where("status", "==", status));
    if (city) conditions.push(where("city", "==", city));

    const q = conditions.length > 0 ? query(appsRef, ...conditions) : appsRef;
    const snap = await getDocs(q);

    const applications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ success: true, applications });
  } catch (err: any) {
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

    const appRef = doc(db, "applications", body.id);
    const { id, ...updateData } = body;
    await updateDoc(appRef, updateData);

    return NextResponse.json({ success: true, message: "Application updated" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
