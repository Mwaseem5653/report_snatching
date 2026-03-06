// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Use a fallback secret if the env is missing (only for safety, actual verify will use the real secret)
const SECRET = new TextEncoder().encode(process.env.SESSION_JWT_SECRET || "fallback_secret_change_me");

const ROLE_PATHS: Record<string, string> = {
  super_admin: "/dashboard/super-admin",
  admin: "/dashboard/admin",
  officer: "/dashboard/officer-user",
  market_user: "/dashboard/market-user",
  ps_user: "/dashboard/ps-user",
  advanced_tool: "/dashboard/advanced-tool",
  user: "/dashboard/normal-user",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Whitelist Public Routes
  if (
    pathname === "/" ||
    pathname === "/dashboard/normal-user" ||
    pathname.startsWith("/authentication") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.includes(".") // For static files like images/logos
  ) {
    return NextResponse.next();
  }

  // 2. Protect Dashboards
  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("sessionToken")?.value;

    // No token? Go to login
    if (!token) {
      return NextResponse.redirect(new URL("/authentication/login", req.url));
    }

    try {
      // Verify token
      const { payload }: any = await jwtVerify(token, SECRET);
      const role = (payload.role || "user").toLowerCase();
      const expectedPath = ROLE_PATHS[role] || "/dashboard/normal-user";

      // If user is at the root /dashboard, send them to their specific one
      if (pathname === "/dashboard") {
        return NextResponse.redirect(new URL(expectedPath, req.url));
      }

      // Check if they are on the wrong path for their role
      if (!pathname.startsWith(expectedPath)) {
        return NextResponse.redirect(new URL(expectedPath, req.url));
      }

      return NextResponse.next();
    } catch (err) {
      console.error("Middleware Auth Error:", err);
      // If token is invalid, clear it and go to login
      const res = NextResponse.redirect(new URL("/authentication/login", req.url));
      res.cookies.delete("sessionToken");
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard"
  ],
};
