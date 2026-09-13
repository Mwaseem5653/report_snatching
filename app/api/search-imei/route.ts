import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imei, allImeis: requestedImeis, user: clientUser } = body;

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

    if (!currentUser && clientUser) {
      currentUser = clientUser;
    }

    let query: any;
    let searchLabel: string;

    if (requestedImeis && Array.isArray(requestedImeis) && requestedImeis.length > 0) {
        // Search for any of the requested IMEIs in the allImeis array field
        query = sql`SELECT * FROM applications WHERE "allImeis" && ${requestedImeis}`;
        searchLabel = requestedImeis.join(", ");
    } else {
        const cleanIMEI = (imei || "").trim();
        query = sql`SELECT * FROM applications WHERE ${cleanIMEI} = ANY("allImeis")`;
        searchLabel = cleanIMEI;
    }

    // 2. Search for ACTIVE reports
    const allReports = await query;
    
    // Find the relevant report. If multiple, prefer pending ones.
    const activeReport = allReports.find((report: any) => report.status !== "complete") || allReports[0];

    const isMatch = !!activeReport;
    const applicationId = activeReport ? activeReport.id : null;

    // Check application status for search result
    let status = "match_found";
    if (isMatch) {
        if (activeReport.status === "processed" || activeReport.status === "complete") {
            status = "cleared";
        }
    }

    // 3. LOG THE SEARCH ATTEMPT (Always insert into Neon DB)
    const logUserId = currentUser?.uid || "guest_user";
    const logUserName = currentUser?.name || "Guest User";
    const logUserEmail = currentUser?.email || "N/A";
    const logUserRole = currentUser?.role || "public";
    const logUserPs = currentUser?.ps || "N/A";

    try {
        await sql`
            INSERT INTO imei_search_logs (
                "userId", "userName", "userEmail", "userRole", "userPs", 
                "searchedImei", "isMatch", "timestamp", "date"
            ) VALUES (
                ${logUserId}, ${logUserName}, ${logUserEmail}, 
                ${logUserRole}, ${logUserPs}, ${searchLabel}, 
                ${isMatch}, ${new Date().toISOString()}, ${new Date().toISOString().split('T')[0]}
            )
        `;
    } catch (logErr) {
        console.error("Failed to log IMEI search attempt:", logErr);
    }


    // 4. LOG THE RECOVERY MATCH (Only for Active/Stolen devices)
    const restrictedRoles = ["super_admin", "admin", "officer"];
    if (isMatch && currentUser && !restrictedRoles.includes(currentUser.role)) {
        // Only log if not already recovered
        if (status === "match_found") {
            await sql`
                INSERT INTO matched_imeis (
                    "imei", "applicationId", "applicantName", "crimeHead", 
                    "originalPs", "originalDistrict", "foundBy", "matchedAt", "status"
                ) VALUES (
                    ${searchLabel}, ${applicationId}, ${activeReport?.applicantName || "N/A"}, 
                    ${activeReport?.crimeHead || "N/A"}, ${activeReport?.ps || "N/A"}, 
                    ${activeReport?.district || "N/A"}, ${JSON.stringify({
                        uid: currentUser.uid,
                        name: currentUser.name || "Unknown",
                        role: currentUser.role,
                        email: currentUser.email || "",
                        mobile: currentUser.mobile || "",
                        ps: currentUser.ps || "",
                        district: currentUser.district || ""
                    })}, ${new Date().toISOString()}, 'new'
                )
            `;
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
