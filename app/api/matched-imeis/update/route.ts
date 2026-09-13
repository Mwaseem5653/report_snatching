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

    const updateFields: any = {};
    const now = new Date().toISOString();

    if (action === "officer_view") {
        updateFields.officerNote = note || "";
        updateFields.status = "processed";
        updateFields.viewedBy = JSON.stringify({
            uid: currentUser.uid,
            name: currentUser.name,
            role: currentUser.role,
            email: currentUser.email || "",
            mobile: currentUser.mobile || "",
            ps: currentUser.ps || "",
            district: currentUser.district || "",
            at: now
        });
    } 
    else if (action === "admin_acknowledge") {
        updateFields.status = "cleared";
        updateFields.superAdminCleared = true;
        updateFields.adminCleared = true;
        updateFields.acknowledgedBy = JSON.stringify({
            uid: currentUser.uid,
            name: currentUser.name,
            role: currentUser.role,
            email: currentUser.email || "",
            mobile: currentUser.mobile || "",
            ps: currentUser.ps || "",
            district: currentUser.district || "",
            at: now
        });

        // 🚀 ALSO UPDATE ORIGINAL APPLICATION STATUS
        const applicationId = matchDoc.applicationId;
        if (applicationId) {
            await sql`
                UPDATE applications SET 
                "status" = 'processed', 
                "processedBy" = ${JSON.stringify({
                    uid: currentUser.uid,
                    name: currentUser.name,
                    at: now,
                    note: note || "Automatically processed via IMEI Match"
                })}
                WHERE "id" = ${applicationId}
            `;
        }
    } 
    else if (action === "not_clear") {
        updateFields.status = "processed";
        updateFields.acknowledgedBy = null;
    }

    // Dynamic update
    const keys = Object.keys(updateFields);
    if (keys.length > 0) {
        let updateQuery = sql`UPDATE matched_imeis SET `;
        keys.forEach((key, index) => {
            updateQuery = sql`${updateQuery} "${key}" = ${updateFields[key]} ${index < keys.length - 1 ? sql`, ` : sql``}`;
        });
        updateQuery = sql`${updateQuery} WHERE "id" = ${matchId}`;
        await updateQuery;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update match error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
