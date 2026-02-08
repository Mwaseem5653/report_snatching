import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminDb, adminAuth } from "@/firebaseAdmin";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;
const MAX_AGE = parseInt(process.env.SESSION_MAX_AGE || "3600", 10);
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
    
    const firebaseRes = await fetch(signInUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    const firebaseData = await firebaseRes.json();

    if (!firebaseRes.ok) {
      const errorCode = firebaseData.error?.message;
      let userFriendlyMsg = "Invalid email or password.";
      if (errorCode === "EMAIL_NOT_FOUND" || errorCode === "INVALID_PASSWORD") userFriendlyMsg = "Invalid credentials.";
      if (errorCode === "USER_DISABLED") userFriendlyMsg = "This account has been disabled.";
      return NextResponse.json({ error: userFriendlyMsg }, { status: 401 });
    }

    const { localId: uid, idToken } = firebaseData;
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    let userDoc = await adminDb.collection("users").doc(uid).get();
    let userData: any = null;

    if (userDoc.exists) {
        userData = userDoc.data();
    } else {
        const emailSnapshot = await adminDb.collection("users").where("email", "==", email).limit(1).get();
        if (!emailSnapshot.empty) {
            userDoc = emailSnapshot.docs[0];
            userData = userDoc.data();
        }
    }
    
    if (!userData) {
        return NextResponse.json({ error: "Access denied: Official profile not found." }, { status: 403 });
    }

    const payload = {
      uid: uid,
      email: email,
      role: decodedToken.role || userData.role || "User",
      name: userData.name || "Official",
      city: userData.city || null,
      district: userData.district || null,
      ps: userData.ps || null,
      mobile: userData.phone || userData.mobile || null,
      buckle: userData.buckle || null, 
      tokens: userData.tokens || 0,
      eyeconTokens: userData.eyeconTokens || 0,
      permissions: userData.permissions || {} // 🚀 Include permissions in JWT
    };

    const sessionToken = jwt.sign(payload, SECRET, { expiresIn: `${MAX_AGE}s` });

    const cookieStore = await cookies();
    cookieStore.set({
      name: "sessionToken",
      value: sessionToken,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: MAX_AGE,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("create-session POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value || null;

    if (!token) return NextResponse.json({ authenticated: false });

    const decoded: any = jwt.verify(token, SECRET);
    
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    
    if (userDoc.exists) {
        const liveData = userDoc.data();
        return NextResponse.json({ 
            authenticated: true, 
            ...decoded,
            tokens: liveData?.tokens || 0,
            eyeconTokens: liveData?.eyeconTokens || 0,
            role: liveData?.role || decoded.role,
            permissions: liveData?.permissions || {} // 🚀 Fetch LIVE permissions
        });
    }

    return NextResponse.json({ authenticated: true, ...decoded });
  } catch (err) {
    return NextResponse.json({ authenticated: false });
  }
}