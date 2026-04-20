import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import * as admin from "firebase-admin";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { imei, allImeis: requestedImeis } = await req.json();

    if (!imei && (!requestedImeis || !Array.isArray(requestedImeis))) {
      return NextResponse.json({ success: false, message: "IMEI or allImeis array is required" }, { status: 400 });
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

    const appsRef = adminDb.collection("applications");
    let query: any;
    let searchLabel: string;

    if (requestedImeis && Array.isArray(requestedImeis) && requestedImeis.length > 0) {
        // Search for any of the requested IMEIs in the allImeis array field
        query = appsRef.where("allImeis", "array-contains-any", requestedImeis);
        searchLabel = requestedImeis.join(", ");
    } else {
        const cleanIMEI = imei.trim();
        // Search for the single IMEI in the allImeis array field
        query = appsRef.where("allImeis", "array-contains", cleanIMEI);
        searchLabel = cleanIMEI;
    }

    // 2. Search for ACTIVE reports using the 'allImeis' array field
    const snapshot = await query.get();
    const allReports = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    const activeReport = allReports.find((report: any) => report.status !== "complete");

    const isMatch = !!activeReport;
    const applicationId = activeReport ? activeReport.id : null;

    // Check existing match status in 'matched_imeis'
    let status = "match_found";
    if (isMatch) {
        const matchSnap = await adminDb.collection("matched_imeis")
            .where("applicationId", "==", applicationId)
            .where("imei", "==", searchLabel)
            .limit(1)
            .get();
            
        if (!matchSnap.empty) {
            const matchData = matchSnap.docs[0].data();
            if (matchData.status === "recovered") {
                status = "recovered_device";
            }
        }
    }

    // 3. LOG THE RECOVERY MATCH (Only for Active/Stolen devices)
    const restrictedRoles = ["super_admin", "admin", "officer"];
    if (isMatch && currentUser && !restrictedRoles.includes(currentUser.role)) {
        // Only log if not already recovered
        if (status === "match_found") {
            await adminDb.collection("matched_imeis").add({
                imei: searchLabel,
                applicationId,
                applicantName: activeReport?.applicantName || "N/A",
                crimeHead: activeReport?.crimeHead || "N/A",
                originalPs: activeReport?.ps || "N/A",
                originalDistrict: activeReport?.district || "N/A",
                foundBy: {
                    uid: currentUser.uid,
                    name: currentUser.name || "Unknown",
                    role: currentUser.role,
                },
                matchedAt: admin.firestore.Timestamp.now(),
                status: "new"
            });
        }
    }

    // 4. Response logic
    if (!isMatch) {
      return NextResponse.json({ success: false, message: "No active record found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ps: activeReport?.ps || "Unknown",
        crimeHead: activeReport?.crimeHead || "Unknown",
        status: status,
      },
    });
  } catch (error: any) {
    console.error("Search IMEI Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
