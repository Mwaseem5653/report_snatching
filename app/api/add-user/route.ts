import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/firebaseAdmin";

/**
 * 🚀 Refactored Add User API
 * Now uses Firebase native Authentication + Custom Claims + Firestore
 */
export async function POST(req: Request) {
  try {
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
    } = body;

    // 1. Basic Validation
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
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
            return NextResponse.json({ success: false, error: "Email already registered in Authentication system." }, { status: 400 });
        }
        throw authErr;
    }

    const uid = userRecord.uid;

    // 3. Set Custom Claims (Baked into the Auth Token for security)
    // This makes the role un-tamperable on the client side
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
    };

    // Use Auth UID as the document ID for perfect mapping
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