import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminDb } from "@/firebaseAdmin";
import * as admin from "firebase-admin";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;

    if (token) {
        try {
            const decoded: any = jwt.verify(token, SECRET);
            if (decoded.uid) {
                await adminDb.collection("users").doc(decoded.uid).update({
                    currentSessionId: admin.firestore.FieldValue.delete()
                });
            }
        } catch (e) {
            console.error("Token verification during logout failed:", e);
        }
    }

    // 🧹 Delete all relevant cookies properly
    const cookieNames = ["sessionToken", "userRole", "userName", "userEmail"];

    cookieNames.forEach((name) => {
      cookieStore.set({
        name,
        value: "",
        path: "/",
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",});
    });

    // ✅ Return JSON to confirm logout
    const res = NextResponse.json({ success: true });

    // Also ensure the response clears cookies in the browser
    cookieNames.forEach((name) => {
      res.cookies.set({
        name,
        value: "",
        path: "/",
        maxAge: 0,
      });
    });

    // Prevent cached pages after logout
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");

    return res;
  } catch (err: any) {
    console.error("Logout error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
