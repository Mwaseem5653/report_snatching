import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/firebaseconfig";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { email, password } = req.body;
    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    return res.status(200).json({ uid: userCred.user.uid, message: "User created!" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}
