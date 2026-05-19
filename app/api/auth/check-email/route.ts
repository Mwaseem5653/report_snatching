import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 🚀 Use Admin SDK to check Firestore (Bypasses security rules)
    const usersRef = adminDb.collection("users");
    const snapshot = await usersRef.where("email", "==", email).get();

    if (snapshot.empty) {
      return NextResponse.json({ exists: false, error: "This email address is not registered in our system." });
    }

    return NextResponse.json({ exists: true });
  } catch (error: any) {
    console.error("Check Email Error:", error);
    return NextResponse.json({ error: "Server error occurred" }, { status: 500 });
  }
}
