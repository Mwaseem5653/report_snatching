import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminDb, adminAuth } from "@/firebaseAdmin";
import * as admin from "firebase-admin";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET || "fallback_secret_change_me";
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

async function checkAndWipeExpiredTokens(uid: string, userData: any) {
    const now = new Date();
    const updates: any = {};
    let changed = false;

    if (userData.tokensExpiry) {
        const gExp = userData.tokensExpiry.toDate ? userData.tokensExpiry.toDate() : new Date(userData.tokensExpiry);
        if (gExp < now && userData.tokens > 0) {
            updates.tokens = 0;
            updates.tokensExpiry = null;
            changed = true;
        }
    }

    if (userData.eyeconTokensExpiry) {
        const eExp = userData.eyeconTokensExpiry.toDate ? userData.eyeconTokensExpiry.toDate() : new Date(userData.eyeconTokensExpiry);
        if (eExp < now && userData.eyeconTokens > 0) {
            updates.eyeconTokens = 0;
            updates.eyeconTokensExpiry = null;
            changed = true;
        }
    }

    if (changed) {
        await adminDb.collection("users").doc(uid).update(updates);
        return { ...userData, ...updates };
    }
    return userData;
}

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
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const { localId: uid } = firebaseData;
    let userDoc = await adminDb.collection("users").doc(uid).get();
    let userData = userDoc.exists ? userDoc.data() : null;

    if (!userData) {
        return NextResponse.json({ error: "Access denied: Official profile not found." }, { status: 403 });
    }

    // 🚀 Wipe expired tokens on login
    const finalData = await checkAndWipeExpiredTokens(uid, userData);

    const sessionId = Math.random().toString(36).substring(2, 15);

    const payload = {
      uid: uid,
      email: email,
      role: finalData.role || "User",
      name: finalData.name || "Official",
      city: finalData.city || null,
      district: finalData.district || null,
      ps: finalData.ps || null,
      tokens: finalData.tokens || 0,
      eyeconTokens: finalData.eyeconTokens || 0,
      tokensExpiry: finalData.tokensExpiry || null,
      eyeconTokensExpiry: finalData.eyeconTokensExpiry || null,
      permissions: finalData.permissions || {} 
    };

    await adminDb.collection("users").doc(uid).update({
        currentSessionId: sessionId,
        lastActive: admin.firestore.Timestamp.now(),
        lastLogin: admin.firestore.Timestamp.now()
    });

    const sessionToken = jwt.sign(payload, SECRET, { expiresIn: "3h" });

    const cookieStore = await cookies();
    cookieStore.set({
      name: "sessionToken",
      value: sessionToken,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 3 * 60 * 60,
    });

    return NextResponse.json({ success: true, role: payload.role });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value || null;
    if (!token) return NextResponse.json({ authenticated: false });

    const decoded: any = jwt.verify(token, SECRET);
    const userRef = adminDb.collection("users").doc(decoded.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
        const res = NextResponse.json({ authenticated: false });
        res.cookies.delete("sessionToken");
        return res;
    }

    let liveData = userDoc.data();
    
    // 🚀 Wipe expired tokens on heartbeat
    liveData = await checkAndWipeExpiredTokens(decoded.uid, liveData);

    await userRef.update({ lastActive: admin.firestore.Timestamp.now() });

    return NextResponse.json({ 
        authenticated: true, 
        ...decoded,
        tokens: liveData?.tokens || 0,
        eyeconTokens: liveData?.eyeconTokens || 0,
        tokensExpiry: liveData?.tokensExpiry || null,
        eyeconTokensExpiry: liveData?.eyeconTokensExpiry || null,
        permissions: liveData?.permissions || {}
    });
  } catch (err) {
    const res = NextResponse.json({ authenticated: false });
    res.cookies.delete("sessionToken");
    return res;
  }
}
