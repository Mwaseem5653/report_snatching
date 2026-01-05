// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.SESSION_JWT_SECRET!);

const ROLE_PATHS: Record<string, string> = {
  super_admin: "/dashboard/super-admin",
  admin: "/dashboard/admin",
  officer: "/dashboard/officer-user",
  market_user: "/dashboard/market-user",
  ps_user: "/dashboard/ps-user",
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Whitelist public routes
  if (
    url.pathname === ("/dashboard/normal-user") || 
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/authentication") ||
    url.pathname === "/" ||
    url.pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Dashboard protection
  if (url.pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("sessionToken")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/authentication/login", req.nextUrl.origin));
    }

    try {
      const { payload }: any = await jwtVerify(token, SECRET);

      const roleKey = (payload.role || "").toLowerCase();
      const expectedPath = ROLE_PATHS[roleKey] ?? "/dashboard/user";

      if (!url.pathname.startsWith(expectedPath)) {
        return NextResponse.redirect(new URL(expectedPath, req.nextUrl.origin));
      }

      return NextResponse.next();
    } catch (err) {
      console.warn("JWT verification failed:", err);
      return NextResponse.redirect(new URL("/authentication/login", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/dashboard"],
};
