import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/firebaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, SECRET);
    if (decoded.role !== "super_admin") {
      return NextResponse.json({ error: "Only Super Admin can delete notifications" }, { status: 403 });
    }

    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No notification IDs provided" }, { status: 400 });
    }

    const batch = adminDb.batch();
    const collection = adminDb.collection("matched_imeis");

    ids.forEach((id: string) => {
      const docRef = collection.doc(id);
      batch.delete(docRef);
    });

    await batch.commit();

    return NextResponse.json({ success: true, message: `${ids.length} notifications deleted successfully` });
  } catch (error: any) {
    console.error("Batch delete matched-imeis error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
