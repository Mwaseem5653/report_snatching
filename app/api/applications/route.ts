import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded: any;
    try { decoded = jwt.verify(token, SECRET); } catch (err) { return NextResponse.json({ error: "Invalid session" }, { status: 401 }); }

    const { role, district: requesterDistrict, ps: requesterPs } = decoded;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const requestedDistrict = searchParams.get("district");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    
    let ps = searchParams.get("ps")?.toLowerCase();

    if (role === "ps_user") {
        if (!requesterPs) return NextResponse.json({ success: true, applications: [] });
        ps = requesterPs.toLowerCase();
    }

    let period = searchParams.get("period");
    if (!period) period = "none";
    
    if (period === "none") {
        return NextResponse.json({ success: true, applications: [] });
    }
    
    const search = searchParams.get("search")?.toLowerCase();
    
    // Build SQL Query
    let query = sql`SELECT * FROM applications WHERE 1=1`;

    if (fromDate && toDate) {
        query = sql`${query} AND "createdAt" >= ${fromDate}::timestamp AND "createdAt" <= ${toDate}::timestamp + interval '23 hours 59 minutes 59 seconds'`;
    }

    const hasAdvancedAccess = decoded.permissions?.advanced_reports === true;

    if ((role === "admin" || role === "officer") && !hasAdvancedAccess) {
        if (Array.isArray(requesterDistrict)) {
            if (requestedDistrict && requestedDistrict !== "all") {
                if (requesterDistrict.includes(requestedDistrict)) {
                    query = sql`${query} AND "district" = ${requestedDistrict}`;
                } else {
                    return NextResponse.json({ error: "Access denied" }, { status: 403 });
                }
            } else {
                if (requesterDistrict.length > 0) query = sql`${query} AND "district" = ANY(${requesterDistrict})`;
                else return NextResponse.json({ success: true, applications: [] });
            }
        } else if (requesterDistrict) {
            query = sql`${query} AND "district" = ${requesterDistrict}`;
        } else {
            return NextResponse.json({ success: true, applications: [] });
        }
    } else if (role === "super_admin" || hasAdvancedAccess) {
        if (requestedDistrict && requestedDistrict !== "all") {
            query = sql`${query} AND "district" = ${requestedDistrict}`;
        }
    } else if (role === "ps_user") {
        if (requesterPs) query = sql`${query} AND "ps" = ${requesterPs}`;
        else return NextResponse.json({ success: true, applications: [] });
    }

    if (status && status !== "none" && status !== "all") {
        if (status.includes(",")) {
            const statusArray = status.split(",");
            query = sql`${query} AND "status" = ANY(${statusArray})`;
        } else {
            query = sql`${query} AND "status" = ${status}`;
        }
    }

    let applications = await query;

    // 3. Robust In-Memory Period Filter
    if (period && period !== "all" && period !== "custom") {
      const now = new Date();
      applications = applications.filter((app: any) => {
        if (!app.createdAt) return false;
        const appDate = new Date(app.createdAt);
        
        if (period === "today") {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return appDate >= oneDayAgo;
        }

        if (period === "6h") {
            const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
            return appDate >= sixHoursAgo;
        }

        if (period === "12h") {
            const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
            return appDate >= twelveHoursAgo;
        }

        let limitDate = new Date();
        if (period === "15days") limitDate.setDate(now.getDate() - 15);
        else if (period === "1month") limitDate.setMonth(now.getMonth() - 1);
        else if (period === "3months") limitDate.setMonth(now.getMonth() - 3);
        else if (period === "6months") limitDate.setMonth(now.getMonth() - 6);
        else if (period === "1year") limitDate.setFullYear(now.getFullYear() - 1);
        
        return appDate >= limitDate;
      });
    }

    if (search) {
      applications = applications.filter((app: any) => 
        app.applicantName?.toLowerCase().includes(search) ||
        app.cnic?.includes(search) ||
        (app.allImeis && app.allImeis.some((imei: string) => imei.includes(search)))
      );
    }

    // Handle multiple PS filter
    const psParam = searchParams.get("ps"); 
    if (psParam) {
        const psArray = psParam.toLowerCase().split(",");
        applications = applications.filter((app: any) => 
            app.ps && psArray.includes(app.ps.toLowerCase())
        );
    }

    applications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, applications });
  } catch (error: any) {
    console.error("GET /api/applications error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    let allImeis: string[] = [];
    if (body.devices && Array.isArray(body.devices)) {
        body.devices.forEach((d: any) => {
            if (d.imei1) allImeis.push(d.imei1);
            if (d.imei2) allImeis.push(d.imei2);
        });
    } else if (body.imei1) {
        allImeis.push(body.imei1);
        if (body.imei2) allImeis.push(body.imei2);
    }

    if (allImeis.length > 0) {
        const duplicateCheck = await sql`SELECT id FROM applications WHERE "allImeis" && ${allImeis} LIMIT 1`;
        if (duplicateCheck.length > 0) {
            return NextResponse.json({ success: false, message: "One or more IMEI numbers already exist in the system." }, { status: 400 });
        }
    }

    const id = require("crypto").randomUUID();
    const createdAt = new Date().toISOString();
    const appRole = body.role === "user" || body.role === "citizen" ? "user" : (body.role || "official");
    const newApp = { 
        ...body, 
        id,
        role: appRole,
        allImeis: allImeis, 
        status: "pending", 
        createdAt 
    };

    await sql`
        INSERT INTO applications (
            "id", "applicantName", "applicantMobile", "cnic", "city", "district", "ps", "crimeHead", 
            "offenceDate", "offenceTime", "offenceAddress", "note", "pictureUrl", "attachmentUrl", 
            "otherLostProperty", "devices", "allImeis", "status", "createdAt", "role"
        ) VALUES (
            ${id}, ${newApp.applicantName}, ${newApp.applicantMobile}, ${newApp.cnic}, ${newApp.city}, 
            ${newApp.district}, ${newApp.ps}, ${newApp.crimeHead}, ${newApp.offenceDate || null}, 
            ${newApp.offenceTime}, ${newApp.offenceAddress}, ${newApp.note}, ${newApp.pictureUrl}, 
            ${newApp.attachmentUrl}, ${newApp.otherLostProperty}, ${JSON.stringify(newApp.devices)}, 
            ${newApp.allImeis}, ${newApp.status}, ${createdAt}, ${appRole}
        )
    `;

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error("POST /api/applications error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUser: any = jwt.verify(token, SECRET);
    const body = await req.json();
    const { id, status, comments } = body;

    if (!id) return NextResponse.json({ error: "Application ID required" }, { status: 400 });

    const appRes = await sql`SELECT * FROM applications WHERE "id" = ${id}`;
    if (appRes.length === 0) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const appData = appRes[0];
    const currentStatus = appData.status;

    if (status === "processed" && currentStatus === "pending") {
        const processedBy = JSON.stringify({
            uid: currentUser.uid,
            name: currentUser.name,
            mobile: currentUser.mobile,
            role: currentUser.role,
            buckle: currentUser.buckle || "N/A",
            at: new Date().toISOString()
        });
        await sql`UPDATE applications SET "status" = 'processed', "processedBy" = ${processedBy} WHERE "id" = ${id}`;
        return NextResponse.json({ success: true, message: "Application marked as processed" });
    }

    if (status === "complete" && currentStatus === "processed") {
        const processedBy = typeof appData.processedBy === 'string' ? JSON.parse(appData.processedBy) : appData.processedBy;
        
        if (processedBy?.uid !== currentUser.uid) {
            return NextResponse.json({ error: "Only the processing officer can mark this case as complete." }, { status: 403 });
        }

        if (!comments || comments.trim().length < 5) {
            return NextResponse.json({ error: "Final remarks/comments are mandatory to complete the case." }, { status: 400 });
        }

        const completedBy = JSON.stringify({
            uid: currentUser.uid,
            name: currentUser.name,
            mobile: currentUser.mobile,
            role: currentUser.role,
            buckle: currentUser.buckle || "N/A"
        });
        await sql`UPDATE applications SET "status" = 'complete', "comments" = ${comments}, "completedAt" = ${new Date().toISOString()}, "completedBy" = ${completedBy} WHERE "id" = ${id}`;
        return NextResponse.json({ success: true, message: "Application marked as complete" });
    }

    if (currentUser.role === "admin" || currentUser.role === "super_admin") {
        const { id, ...updates } = body;
        const keys = Object.keys(updates);
        if (keys.length === 0) return NextResponse.json({ success: true });
        
        // Dynamic update
        let updateQuery = sql`UPDATE applications SET `;
        keys.forEach((key, index) => {
            updateQuery = sql`${updateQuery} "${key}" = ${updates[key]} ${index < keys.length - 1 ? sql`, ` : sql``}`;
        });
        updateQuery = sql`${updateQuery} WHERE "id" = ${id}`;
        
        await updateQuery;
        return NextResponse.json({ success: true, message: "Application updated by Admin" });
    }

    return NextResponse.json({ error: "Invalid status transition or insufficient permissions." }, { status: 400 });

  } catch (err: any) {
    console.error("PUT /api/applications error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded: any;
    try { 
      decoded = jwt.verify(token, SECRET); 
    } catch (err) { 
      return NextResponse.json({ error: "Invalid session" }, { status: 401 }); 
    }

    if (decoded.role !== "super_admin") {
      return NextResponse.json({ error: "Only Super Admin can delete applications." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Application ID required" }, { status: 400 });

    const res = await sql`DELETE FROM applications WHERE "id" = ${id} RETURNING "id"`;

    if (res.length === 0) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Application deleted successfully" });

  } catch (err: any) {
    console.error("DELETE /api/applications error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
