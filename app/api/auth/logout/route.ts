import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();

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
