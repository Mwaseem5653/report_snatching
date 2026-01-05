import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Set-Cookie", [
    serialize("authToken", "", { path: "/", maxAge: -1 }),
    serialize("userRole", "", { path: "/", maxAge: -1 }),
  ]);
  res.status(200).json({ message: "Logged out" });
}
