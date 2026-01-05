import { NextResponse } from "next/server";
import { db } from "@/firebaseconfig";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, ...updates } = body;
    const ref = doc(db, "users", uid);
    await updateDoc(ref, updates);
    return NextResponse.json({ success: true });
  } catch (err : any) {
    console.error("Update error:", err);
    return NextResponse.json({ success: false, error: err.message });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { uid } = body;
    const ref = doc(db, "users", uid);
    await deleteDoc(ref);
    return NextResponse.json({ success: true });
  } catch (err:any) {
    console.error("Delete error:", err);
    return NextResponse.json({ success: false, error: err.message });
  }
}
