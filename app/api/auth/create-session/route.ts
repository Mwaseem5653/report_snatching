import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminDb } from "@/firebaseAdmin";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const SECRET = process.env.SESSION_JWT_SECRET!;
const MAX_AGE = parseInt(process.env.SESSION_MAX_AGE || "3600", 10); // seconds
const SALT_ROUNDS = 10;

// Helper to detect if a string looks like a bcrypt hash
function looksLikeBcryptHash(pw: string | undefined | null) {
  if (!pw || typeof pw !== "string") return false;
  // bcrypt hashes typically start with $2a$ or $2b$ or $2y$ and are ~60 chars
  return /^\$2[aby]\$/.test(pw);
}

// ✅ POST: Login & create session
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const snapshot = await adminDb
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const userDoc = snapshot.docs[0];
    const userData: any = userDoc.data();
    const uid = userDoc.id;

    const stored = userData.password;

    // If stored is a bcrypt hash -> use bcrypt.compare
    if (looksLikeBcryptHash(stored)) {
      const match = await bcrypt.compare(password, stored);
      if (!match) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
    } else {
      // stored seems plain text (legacy). Compare plain, and if matches -> upgrade to hash
      if (password !== stored) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      // Upgrade: hash the plain password and update the user doc (non-blocking but awaited)
      try {
        const newHash = await bcrypt.hash(password, SALT_ROUNDS);
        await adminDb.collection("users").doc(uid).update({
          password: newHash,
          passwordMigratedAt: new Date(),
        });
        // console.log("Password migrated to bcrypt for user:", uid);
      } catch (upErr) {
        console.error("Password migration error for user", uid, upErr);
        // Do not fail login if migration update fails — user is already authenticated.
      }
    }

    // Prepare JWT payload (include extra user info)
    const payload = {
      uid,
      email,
      role: userData.role || "User",
      name: userData.name || null,
      city: userData.city || null,
      district: userData.district || null,
      ps: userData.ps || null,
      mobile: userData.mobile || null,
    };

    // JWT sign
    const token = jwt.sign(payload, SECRET, { expiresIn: `${MAX_AGE}s` });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "sessionToken",
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: MAX_AGE,
    });

    return NextResponse.json({ success: true, user: payload });
  } catch (err: any) {
    console.error("create-session POST error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

// ✅ GET: fetch session (decode JWT)
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sessionToken")?.value || null;

  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const decoded: any = jwt.verify(token, SECRET);

    return NextResponse.json({
      authenticated: true,
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      city: decoded.city,
      district: decoded.district,
      ps: decoded.ps,
      mobile: decoded.mobile,
    });
  } catch (err) {
    console.error("create-session GET error:", err);
    return NextResponse.json({ authenticated: false });
  }
}
