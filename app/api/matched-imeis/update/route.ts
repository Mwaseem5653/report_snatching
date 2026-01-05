import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import * as admin from "firebase-admin";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { matchId, note, action } = await req.json();

    if (!matchId) {
      return NextResponse.json({ error: "Match ID is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser: any = jwt.verify(token, SECRET);
    const matchRef = adminDb.collection("matched_imeis").doc(matchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (action === "officer_view") {
        updateData.officerNote = note || "";
        updateData.viewedBy = {
            uid: currentUser.uid,
            name: currentUser.name,
            role: currentUser.role,
            at: admin.firestore.Timestamp.now()
        };
        updateData.status = "processed"; // Change from 'new' to 'processed'
    } 
    else if (action === "admin_acknowledge") {
        updateData.acknowledgedBy = {
            uid: currentUser.uid,
            name: currentUser.name,
            role: currentUser.role,
            at: admin.firestore.Timestamp.now()
        };
        updateData.status = "cleared"; // Alert count will skip this
    }

    await matchRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update match error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
