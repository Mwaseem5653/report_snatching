import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/firebaseAdmin";
import { deductFromPool, logTokenTransaction } from "@/lib/tokenPool";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

/**
 * 🚀 Refactored Update User API
 * Syncs Firestore Metadata with Firebase Native Authentication
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    const decoded: any = token ? jwt.verify(token, SECRET) : null;
    const adminEmail = decoded?.email || "System";

    const body = await req.json();
    const { uid, password, role, ...metadata } = body;

    if (!uid) {
      return NextResponse.json({ success: false, error: "Missing UID" }, { status: 400 });
    }

    // Fetch Current Data for comparison
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    const currentData = userDoc.data();

    // 1. Update Firebase Native Authentication
    const authUpdates: any = {};
    if (password) authUpdates.password = password;
    if (metadata.name) authUpdates.displayName = metadata.name;
    if (metadata.email) authUpdates.email = metadata.email;

    if (Object.keys(authUpdates).length > 0) {
        await adminAuth.updateUser(uid, authUpdates);
    }

    // 2. Update Custom Claims if role or district changed
    if (role || metadata.district || metadata.ps) {
        const user = await adminAuth.getUser(uid);
        const newClaims = {
            ...(user.customClaims || {}),
            role: role || (user.customClaims?.role),
            district: metadata.district !== undefined ? metadata.district : (user.customClaims?.district),
            ps: metadata.ps !== undefined ? metadata.ps : (user.customClaims?.ps),
        };
        await adminAuth.setCustomUserClaims(uid, newClaims);
    }

    // 3. Token Logic (Deduct from Pool if increased)
    if (metadata.tokens !== undefined) {
        const diff = parseInt(metadata.tokens) - (currentData?.tokens || 0);
        if (diff > 0) {
            await deductFromPool(diff, "general");
            await logTokenTransaction({ from: "Pool", toEmail: currentData?.email || "Unknown", amount: diff, type: "general", action: "issue", adminEmail });
        }
    }
    if (metadata.eyeconTokens !== undefined) {
        const diff = parseInt(metadata.eyeconTokens) - (currentData?.eyeconTokens || 0);
        if (diff > 0) {
            await deductFromPool(diff, "eyecon");
            await logTokenTransaction({ from: "Pool", toEmail: currentData?.email || "Unknown", amount: diff, type: "eyecon", action: "issue", adminEmail });
        }
    }

    // 4. Update Firestore Document
    const firestoreUpdates: any = { ...metadata };
    if (role) firestoreUpdates.role = role;
    if (metadata.tokens !== undefined) firestoreUpdates.tokens = parseInt(metadata.tokens) || 0;
    if (metadata.eyeconTokens !== undefined) firestoreUpdates.eyeconTokens = parseInt(metadata.eyeconTokens) || 0;
    if (metadata.hasToolsAccess !== undefined) firestoreUpdates.hasToolsAccess = !!metadata.hasToolsAccess;
    
    // We don't store passwords in Firestore anymore (managed by Firebase Auth)
    delete firestoreUpdates.password; 

    await adminDb.collection("users").doc(uid).update(firestoreUpdates);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Update error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * 🚀 Refactored Delete User API
 * Deletes from both Firebase Auth and Firestore
 */
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json({ success: false, error: "Missing UID" }, { status: 400 });
    }

    // 1. Delete from Firebase Authentication
    try {
        await adminAuth.deleteUser(uid);
    } catch (authErr: any) {
        console.warn("Auth deletion failed or user already missing:", authErr.message);
    }

    // 2. Delete from Firestore
    await adminDb.collection("users").doc(uid).delete();
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
