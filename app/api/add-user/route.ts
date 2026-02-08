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
      tokens,
      eyeconTokens,
      permissions // 🚀 Capture new permissions object
    } = body;

    // 1. Basic Validation
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const tAmount = parseInt(tokens) || 0;
    const eAmount = parseInt(eyeconTokens) || 0;

    // 🚀 Check and Deduct from Pool
    if (tAmount > 0) await deductFromPool(tAmount, "general");
    if (eAmount > 0) await deductFromPool(eAmount, "eyecon");

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
      tokens: tAmount,
      eyeconTokens: eAmount,
      permissions: permissions || {} // 🚀 Store in Firestore
    };

    await adminDb.collection("users").doc(uid).set(userData);

    // 🚀 Log Transaction
    if (tAmount > 0) await logTokenTransaction({ from: "Pool", toEmail: email, amount: tAmount, type: "general", action: "issue", adminEmail });
    if (eAmount > 0) await logTokenTransaction({ from: "Pool", toEmail: email, amount: eAmount, type: "eyecon", action: "issue", adminEmail });

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
