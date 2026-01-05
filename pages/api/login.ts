import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
import { auth } from "@/firebaseconfig";
import { signInWithEmailAndPassword } from "firebase/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { email, password, role } = req.body;
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCred.user.getIdToken();

    res.setHeader("Set-Cookie", [
      serialize("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24,
      }),
      serialize("userRole", role, {
        httpOnly: false,
        path: "/",
        maxAge: 60 * 60 * 24,
      }),
    ]);

    return res.status(200).json({ message: "Login successful" });
  } catch (err: any) {
    return res.status(401).json({ error: err.message });
  }
}
