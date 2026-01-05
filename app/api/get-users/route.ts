import { NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = (await cookieStore).get("sessionToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Decode Requester Session
    let decoded: any;
    try {
      decoded = jwt.verify(token, SECRET);
    } catch (err) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { role: requesterRole, district: requesterDistrict } = decoded;

    // 2. Parse Query Params
    const { searchParams } = new URL(req.url);
    const queryParam = searchParams.get("query")?.toLowerCase() || "";
    const requestedRole = searchParams.get("role");
    const requestedDistrict = searchParams.get("district");

    let queryRef: any = adminDb.collection("users");

    // 3. APPLY SECURITY RESTRICTIONS (Backend Enforcement)
    
    if (requesterRole === "super_admin") {
      // Super Admin: No restrictions, can use provided filters
      if (requestedRole) queryRef = queryRef.where("role", "==", requestedRole);
      if (requestedDistrict) queryRef = queryRef.where("district", "==", requestedDistrict);
    } 
    else if (requesterRole === "admin") {
      // Admin: Restricted to their district and specific roles (PS & Market only)
      const allowedRoles = ["ps_user", "market_user"];
      
      // Enforce Role Hierarchy
      if (requestedRole) {
        if (!allowedRoles.includes(requestedRole)) {
          return NextResponse.json({ error: "Access denied to this role" }, { status: 403 });
        }
        queryRef = queryRef.where("role", "==", requestedRole);
      }

      // Enforce District Ownership
      if (Array.isArray(requesterDistrict)) {
        if (requesterDistrict.length > 0) {
            queryRef = queryRef.where("district", "in", requesterDistrict);
        }
      } else if (requesterDistrict) {
        queryRef = queryRef.where("district", "==", requesterDistrict);
      } else {
        return NextResponse.json({ users: [] });
      }
    } 
    else if (requesterRole === "officer") {
      // Officer: Restricted to their district and specific roles
      const allowedRoles = ["ps_user", "market_user"];
      
      if (requestedRole) {
        if (!allowedRoles.includes(requestedRole)) {
          return NextResponse.json({ error: "Access denied to this role" }, { status: 403 });
        }
        queryRef = queryRef.where("role", "==", requestedRole);
      }

      if (requesterDistrict) {
        queryRef = queryRef.where("district", "==", requesterDistrict);
      } else {
        return NextResponse.json({ users: [] });
      }
    } 
    else {
      // Other roles cannot manage users
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. Fetch Documents
    const snapshot = await queryRef.get();
    let users = snapshot.docs.map((doc: any) => ({ uid: doc.id, ...doc.data() }));

    // 5. Final In-Memory Filtering (Safeguard)
    if (requesterRole !== "super_admin") {
      const allowedRoles = ["ps_user", "market_user"];
      users = users.filter((u: any) => allowedRoles.includes(u.role));
    }

    // Text Search Filter
    if (queryParam) {
      users = users.filter(
        (u: any) =>
          (u.name && u.name.toLowerCase().includes(queryParam)) ||
          (u.email && u.email.toLowerCase().includes(queryParam)) ||
          (u.buckle && u.buckle.toLowerCase().includes(queryParam))
      );
    }

    // 6. Data Sanitization (Exclude sensitive fields)
    users = users.map((user: any) => {
        const { password, ...safeUser } = user;
        return safeUser;
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error("Get Users API Error:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
