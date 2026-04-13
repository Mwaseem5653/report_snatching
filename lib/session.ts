import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET || "fallback_secret_change_me";

export async function getServerSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;

    if (!token) return null;

    const decoded = jwt.verify(token, SECRET) as any;
    
    return {
      authenticated: true,
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      city: decoded.city,
      district: decoded.district,
      ps: decoded.ps,
      mobile: decoded.mobile,
      hasToolsAccess: !!decoded.hasToolsAccess,
      tokens: decoded.tokens || 0,
      exp: decoded.exp // 🚀 Pass JWT expiration time for countdown
    };
  } catch (err) {
    return null;
  }
}
