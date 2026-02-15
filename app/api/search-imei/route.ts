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
      return NextResponse.json({ success: false, message: "IMEI is required" }, { status: 400 });
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

    // 2. Search for ACTIVE reports only (Ignore 'complete' ones)
    // We fetch any report matching the IMEI
    let snapshot = await appsRef.where("imei1", "==", cleanIMEI).get();
    if (snapshot.empty) {
      snapshot = await appsRef.where("imei2", "==", cleanIMEI).get();
    }

    // 🚀 Logic: A match is only valid if at least one report is NOT 'complete'
    const allReports = snapshot.docs.map((doc: any) => doc.data());
    const activeReport = allReports.find((report: any) => report.status !== "complete");

    const isMatch = !!activeReport;
    const applicationId = snapshot.empty ? null : snapshot.docs[0].id;

    // 3. LOG EVERY SEARCH
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

    // 4. LOG THE RECOVERY MATCH (Only for Active/Stolen devices)
    const restrictedRoles = ["super_admin", "admin", "officer"];
    if (isMatch && currentUser && !restrictedRoles.includes(currentUser.role)) {
        await adminDb.collection("matched_imeis").add({
            imei: cleanIMEI,
            applicationId,
            applicantName: activeReport?.applicantName || "N/A",
            crimeHead: activeReport?.crimeHead || "N/A",
            originalPs: activeReport?.ps || "N/A",
            originalDistrict: activeReport?.district || "N/A",
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

    // 5. Response logic
    if (!isMatch) {
      return NextResponse.json({ success: false, message: "No active record found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ps: activeReport?.ps || "Unknown",
        crimeHead: activeReport?.crimeHead || "Unknown",
        status: "founded",
      },
    });
  } catch (error: any) {
    console.error("Search IMEI Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}