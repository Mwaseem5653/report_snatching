import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminDb, adminAuth } from "@/firebaseAdmin";
import * as admin from "firebase-admin";
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

    // 🚀 SINGLE SESSION POLICY: Prevent multiple logins
    const nowMillis = Date.now();
    const lastActiveMillis = userData.lastActive?.toMillis() || 0;
    const isRecentlyActive = (nowMillis - lastActiveMillis) < 45000; // 45 seconds threshold

    if (userData.currentSessionId && isRecentlyActive) {
        return NextResponse.json({ 
            error: "Only One User allowed. If you recently closed a tab, please wait 45 seconds." 
        }, { status: 403 });
    }

    const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const payload = {
      uid: uid,
      email: email,
      sessionId: sessionId,
      role: decodedToken.role || userData.role || "User",
      name: userData.name || "Official",
      city: userData.city || null,
      district: userData.district || null,
      ps: userData.ps || null,
      mobile: userData.phone || userData.mobile || null,
      buckle: userData.buckle || null, 
      tokens: userData.tokens || 0,
      eyeconTokens: userData.eyeconTokens || 0,
      permissions: userData.permissions || {} 
    };

    // Update session ID and Activity Timestamp in Firestore
    await adminDb.collection("users").doc(userDoc.id).update({
        currentSessionId: sessionId,
        lastActive: admin.firestore.Timestamp.now(),
        lastLogin: admin.firestore.Timestamp.now()
    });

    // 🚀 Remove session time limit - Increase JWT expiry to 1 year
    const sessionToken = jwt.sign(payload, SECRET, { expiresIn: "365d" });

    const cookieStore = await cookies();
    cookieStore.set({
      name: "sessionToken",
      value: sessionToken,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      // maxAge: MAX_AGE, // Omitting maxAge makes it a session cookie (removed when browser closes)
    });

    return NextResponse.json({ 
      success: true, 
      role: payload.role // Returning role for frontend redirection
    });
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
    
    if (!userDoc.exists) {
        // User document deleted from DB
        const res = NextResponse.json({ authenticated: false, reason: "user_deleted" });
        res.cookies.delete("sessionToken");
        return res;
    }

    const liveData = userDoc.data();
    
    // 🚀 Security Check: Single Session Policy
    if (!liveData?.currentSessionId || (decoded.sessionId && decoded.sessionId !== liveData.currentSessionId)) {
        const res = NextResponse.json({ authenticated: false, reason: "duplicate_session" });
        res.cookies.delete("sessionToken");
        return res;
    }

    // 🚀 HEARTBEAT: Update lastActive on every session check
    await adminDb.collection("users").doc(decoded.uid).update({
        lastActive: admin.firestore.Timestamp.now()
    });

    return NextResponse.json({ 
        authenticated: true, 
        ...decoded,
        tokens: liveData?.tokens || 0,
        eyeconTokens: liveData?.eyeconTokens || 0,
        role: liveData?.role || decoded.role,
        permissions: liveData?.permissions || {} // 🚀 Fetch LIVE permissions
    });
  } catch (err) {
    return NextResponse.json({ authenticated: false });
  }
}