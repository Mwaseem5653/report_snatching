import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/firebaseAdmin";
import { deductFromPool, logTokenTransaction } from "@/lib/tokenPool";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    const decoded: any = token ? jwt.verify(token, SECRET) : null;
    const adminEmail = decoded?.email || "System";

    // Role authorization: only super_admin, admin and officer can add users
    const callerRole = decoded?.role;
    const callerUid = decoded?.uid;

    if (!callerRole || !["super_admin", "admin", "officer"].includes(callerRole)) {
      return NextResponse.json({ success: false, error: "Forbidden: Insufficient role" }, { status: 403 });
    }

    const body = await req.json();
    const {
      email,
      password,
      name,
      role,
      phone,
      city,
      district,
      ps,
      market,
      rank,
      buckle,
      enrolledBy,
      permissions
    } = body;

    // 1. Basic Validation
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1b. Role hierarchy enforcement
    if (callerRole === "admin" && ["super_admin", "admin"].includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden: Admins cannot create admin/super_admin roles" }, { status: 403 });
    }
    if (callerRole === "officer" && !["ps_user", "market_user"].includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden: Officers can only create ps_user or market_user" }, { status: 403 });
    }

    // 2. Create User in Firebase Native Authentication
    let userRecord;
    try {
        userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: name,
            phoneNumber: phone ? (phone.startsWith('+') ? phone : `+92${phone.replace(/^0/, '')}`) : undefined,
        });
    } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-exists') {
            return NextResponse.json({ success: false, error: "Email already registered." }, { status: 400 });
        }
        throw authErr;
    }

    const uid = userRecord.uid;

    // 3. Set Custom Claims
    const customClaims = {
        role: role,
        district: district || null,
        ps: ps || null,
    };
    await adminAuth.setCustomUserClaims(uid, customClaims);

    // 4. Store Extended Profile in Firestore
    const userData: Record<string, any> = {
      uid,
      name,
      email,
      role,
      createdAt: new Date(),
      phone: phone || null,
      city: city || null,
      district: district || null,
      ps: ps || null,
      market: market || null,
      rank: rank || null,
      buckle: buckle || null,
      enrolledBy: enrolledBy || null,
      createdByUid: callerUid || null,        // ✅ Who created this user
      createdByRole: callerRole || null,     // ✅ What role created this user
      createdByName: decoded?.name || null,  // ✅ Creator's display name
      tokens: 0,
      eyeconTokens: 0,
      tokensExpiry: null,
      eyeconTokensExpiry: null,
      permissions: permissions || {}
    };

    await adminDb.collection("users").doc(uid).set(userData);

    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (err: any) {
    console.error("add-user error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
