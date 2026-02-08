import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { adminDb } from "@/firebaseAdmin";
import { getTokenPool, updateTokenPool, logTokenTransaction } from "@/lib/tokenPool";

const SECRET = process.env.SESSION_JWT_SECRET!;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sessionToken")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const decoded: any = jwt.verify(token, SECRET);

        if (decoded.role !== "super_admin" && !decoded.permissions?.token_pool) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const pool = await getTokenPool();
        const logsSnapshot = await adminDb.collection("token_logs").orderBy("timestamp", "desc").limit(100).get();
        const logs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return NextResponse.json({ pool, logs });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Verify Password & Add Tokens
export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sessionToken")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const decoded: any = jwt.verify(token, SECRET);

        if (decoded.role !== "super_admin" && !decoded.permissions?.token_pool) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { password, eyeconAmount, generalAmount, action } = body;

        // 1. Verify Admin Password
        const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
        const firebaseRes = await fetch(signInUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: decoded.email, password, returnSecureToken: true }),
        });

        if (!firebaseRes.ok) {
            return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
        }

        if (action === "verify_only") {
            return NextResponse.json({ success: true });
        }

        // 2. Update Pool
        const currentPool = await getTokenPool();
        const newEyecon = (currentPool.eyeconPool || 0) + (parseInt(eyeconAmount) || 0);
        const newGeneral = (currentPool.generalPool || 0) + (parseInt(generalAmount) || 0);

        await updateTokenPool(newEyecon, newGeneral);

        // 3. Log
        if (eyeconAmount > 0) await logTokenTransaction({ from: "System", toEmail: "Pool", amount: eyeconAmount, type: "eyecon", action: "add_to_pool", adminEmail: decoded.email });
        if (generalAmount > 0) await logTokenTransaction({ from: "System", toEmail: "Pool", amount: generalAmount, type: "general", action: "add_to_pool", adminEmail: decoded.email });

        return NextResponse.json({ success: true, pool: { eyeconPool: newEyecon, generalPool: newGeneral } });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
