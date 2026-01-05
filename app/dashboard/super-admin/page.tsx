import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import SuperAdminClient from "@/components/dashboard/SuperAdminClient";

const SECRET = process.env.SESSION_JWT_SECRET!;

export default async function SuperAdminPage() {
  let session = null;
  
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;

    if (token) {
      const decoded = jwt.verify(token, SECRET) as any;
      session = {
        authenticated: true,
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        city: decoded.city,
        district: decoded.district,
        ps: decoded.ps,
        mobile: decoded.mobile,
      };
    }
  } catch (err) {
    console.error("Session error:", err);
  }
  
  return <SuperAdminClient initialSession={session} />;
}
