import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import * as admin from "firebase-admin";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { imei } = await req.json();

    if (!imei) {
      return NextResponse.json(
        { success: false, message: "IMEI is required" },
        { status: 400 }
      );
    }

    // 1. Get Session for Logging
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    let currentUser: any = null;

    if (token) {
      try {
        currentUser = jwt.verify(token, SECRET);
      } catch (err) {
        console.warn("Invalid token in IMEI search log");
      }
    }

    const cleanIMEI = imei.trim();
    const appsRef = adminDb.collection("applications");

    // 2. Search for the device in reports
    let snapshot = await appsRef.where("imei1", "==", cleanIMEI).limit(1).get();
    if (snapshot.empty) {
      snapshot = await appsRef.where("imei2", "==", cleanIMEI).limit(1).get();
    }

    const isMatch = !snapshot.empty;
    const applicationData = !snapshot.empty ? snapshot.docs[0].data() : null;
    const applicationId = !snapshot.empty ? snapshot.docs[0].id : null;

    // 3. LOG EVERY SEARCH (Audit Trail)
    // Log for everyone except super_admin
    if (currentUser && currentUser.role !== "super_admin") {
        await adminDb.collection("search_history").add({
            imei: cleanIMEI,
            searchedBy: {
                uid: currentUser.uid,
                name: currentUser.name || "Unknown",
                role: currentUser.role,
                district: currentUser.district || "N/A",
                ps: currentUser.ps || "N/A",
            },
            timestamp: admin.firestore.Timestamp.now(),
            wasMatch: isMatch
        });
    }

    // 4. LOG THE RECOVERY MATCH (Unique Entry & Role Filtering)
    // - Only log if it's a match
    // - Only log if user is NOT Super Admin, Admin, or Officer (Per user request)
    const restrictedRoles = ["super_admin", "admin", "officer"];
    
    if (isMatch && currentUser && !restrictedRoles.includes(currentUser.role)) {
        
        // 🛑 Check if this IMEI has already been matched to avoid duplicates (150% issue)
        const matchSnapshot = await adminDb.collection("matched_imeis")
            .where("imei", "==", cleanIMEI)
            .limit(1)
            .get();

        if (matchSnapshot.empty) {
            await adminDb.collection("matched_imeis").add({
                imei: cleanIMEI,
                applicationId,
                applicantName: applicationData?.applicantName || "N/A",
                crimeHead: applicationData?.crimeHead || "N/A",
                originalPs: applicationData?.ps || "N/A",
                originalDistrict: applicationData?.district || "N/A",
                foundBy: {
                    uid: currentUser.uid,
                    name: currentUser.name || "Unknown",
                    email: currentUser.email,
                    role: currentUser.role,
                    district: currentUser.district || "N/A",
                    ps: currentUser.ps || "N/A",
                },
                matchedAt: admin.firestore.Timestamp.now(),
                status: "new"
            });
        }
    }

    if (!isMatch) {
      return NextResponse.json({ success: false, message: "No record found" }, { status: 404 });
    }

    // Return result for UI
    return NextResponse.json({
      success: true,
      data: {
        ps: applicationData?.ps || "Unknown",
        crimeHead: applicationData?.crimeHead || "Unknown",
        status: "founded",
      },
    });
  } catch (error: any) {
    console.error("Search IMEI Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}