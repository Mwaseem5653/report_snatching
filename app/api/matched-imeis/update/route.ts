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
        // Only update status to processed if it's currently new, to avoid overriding cleared/other states if we use them
        if (matchDoc.data()?.status === "new") {
             updateData.status = "processed"; 
        }
    } 
    else if (action === "admin_acknowledge") {
        const timestamp = admin.firestore.Timestamp.now();
        const acknowledgeData = {
            uid: currentUser.uid,
            name: currentUser.name,
            role: currentUser.role,
            at: timestamp
        };

        if (currentUser.role === "super_admin") {
            updateData.superAdminCleared = true;
            updateData.superAdminAcknowledgedBy = acknowledgeData;
        } else {
            updateData.adminCleared = true;
            updateData.adminAcknowledgedBy = acknowledgeData;
            // Legacy support: We might still want to mark global status as cleared if Admin does it, 
            // OR we stop using global status for clearing entirely. 
            // Given the requirement "admin pass all unseen show ho... super admin jub tak seen na kare...",
            // it's safer to decouple. We WON'T set global status to 'cleared' to avoid hiding it from Super Admin if they rely on it.
        }
    }

    await matchRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update match error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
