import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

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
    
    // Get existing record from Neon DB
    const matchRes = await sql`SELECT * FROM matched_imeis WHERE "id" = ${matchId}`;
    if (matchRes.length === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    const matchDoc = matchRes[0];

    const now = new Date().toISOString();

    if (action === "officer_view") {
        const viewedBy = JSON.stringify({
            uid: currentUser.uid,
            name: currentUser.name,
            role: currentUser.role,
            email: currentUser.email || "",
            mobile: currentUser.mobile || "",
            ps: currentUser.ps || "",
            district: currentUser.district || "",
            at: now
        });
        await sql`
            UPDATE matched_imeis SET 
            "status" = 'processed',
            "officerNote" = ${note || ""},
            "viewedBy" = ${viewedBy}
            WHERE "id" = ${matchId}
        `;
    } 
    else if (action === "admin_acknowledge") {
        const ackData = JSON.stringify({
            uid: currentUser.uid,
            name: currentUser.name,
            role: currentUser.role,
            email: currentUser.email || "",
            mobile: currentUser.mobile || "",
            ps: currentUser.ps || "",
            district: currentUser.district || "",
            at: now
        });

        // 1. Update matched_imeis record(s)
        await sql`
            UPDATE matched_imeis SET 
            "status" = 'cleared',
            "superAdminCleared" = true,
            "adminCleared" = true,
            "acknowledgedBy" = ${ackData}
            WHERE "id" = ${matchId}
        `;

        // If duplicate unacknowledged notifications exist for this same application, mark them cleared too
        if (matchDoc.applicationId) {
            await sql`
                UPDATE matched_imeis SET 
                "status" = 'cleared',
                "superAdminCleared" = true,
                "adminCleared" = true,
                "acknowledgedBy" = ${ackData}
                WHERE "applicationId" = ${matchDoc.applicationId} AND "status" != 'cleared'
            `;
        }

        // 2. 🚀 ALSO UPDATE ORIGINAL APPLICATION STATUS TO 'PROCESSED'
        const processedBy = JSON.stringify({
            uid: currentUser.uid,
            name: currentUser.name,
            mobile: currentUser.mobile || "",
            role: currentUser.role,
            buckle: currentUser.buckle || "N/A",
            at: now,
            note: note || "Automatically processed via IMEI Match"
        });

        let updatedApp = false;
        if (matchDoc.applicationId) {
            const updateRes = await sql`
                UPDATE applications SET 
                "status" = 'processed', 
                "processedBy" = ${processedBy}
                WHERE "id" = ${matchDoc.applicationId}
                RETURNING "id"
            `;
            if (updateRes.length > 0) updatedApp = true;
        }

        // Fallback: If applicationId was missing or didn't match, update by IMEI
        if (!updatedApp && matchDoc.imei) {
            await sql`
                UPDATE applications SET 
                "status" = 'processed', 
                "processedBy" = ${processedBy}
                WHERE ${matchDoc.imei} = ANY("allImeis")
            `;
        }
    } 
    else if (action === "not_clear") {
        await sql`
            UPDATE matched_imeis SET 
            "status" = 'processed',
            "acknowledgedBy" = null
            WHERE "id" = ${matchId}
        `;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update match error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
