import { NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";

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

    // ✅ Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ Check if user already exists
    const snapshot = await adminDb.collection("users").where("email", "==", email).get();
    if (!snapshot.empty) {
      return NextResponse.json(
        { success: false, error: "User already exists" },
        { status: 400 }
      );
    }

    // ✅ Build user data dynamically (only include filled fields)
    const userData: Record<string, any> = {
      name,
      email,
      password, // ⚠️ For now (testing only)
      role,
      createdAt: new Date(),
    };

    const optionalFields = {
      phone,
      city,
      district,
      ps,
      market,
      rank,
      buckle,
      enrolledBy,
    };

    // ✅ Add only non-empty optional fields
    for (const [key, value] of Object.entries(optionalFields)) {
      if (value !== undefined && value !== null && value !== "") {
        userData[key] = value;
      }
    }

    // ✅ Create new Firestore document
    const userRef = await adminDb.collection("users").add(userData);

    return NextResponse.json({
      success: true,
      user: { uid: userRef.id, ...userData },
    });
  } catch (err: any) {
    console.error("add-user error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
