import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { adminDb } from "@/firebaseAdmin";
import { getTokenPool, updateTokenPool, logTokenTransaction, deductFromPool } from "@/lib/tokenPool";

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
        const logs = logsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        return NextResponse.json({ pool, logs });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

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
        const { password, eyeconAmount, generalAmount, action, targetUid, generalExpiryDays, eyeconExpiryDays } = body;

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

        if (action === "add") {
            const newEyecon = parseInt(eyeconAmount) || 0;
            const newGeneral = parseInt(generalAmount) || 0;
            
            // 🚀 OVERWRITE (Previous pool wiped)
            await updateTokenPool(newEyecon, newGeneral);
            
            if (eyeconAmount > 0) await logTokenTransaction({ from: "System", toEmail: "Pool", amount: eyeconAmount, type: "eyecon", action: "reset_pool", adminEmail: decoded.email });
            if (generalAmount > 0) await logTokenTransaction({ from: "System", toEmail: "Pool", amount: generalAmount, type: "general", action: "reset_pool", adminEmail: decoded.email });
            
            return NextResponse.json({ success: true, pool: { eyeconPool: newEyecon, generalPool: newGeneral } });
        }

        if (action === "issue_to_user") {
            if (!targetUid) return NextResponse.json({ error: "Target user required" }, { status: 400 });
            
            const gAmount = parseInt(generalAmount) || 0;
            const eAmount = parseInt(eyeconAmount) || 0;

            // Deduct from pool (we still deduct the full amount from global pool)
            if (gAmount > 0) await deductFromPool(gAmount, "general");
            if (eAmount > 0) await deductFromPool(eAmount, "eyecon");

            const userRef = adminDb.collection("users").doc(targetUid);
            const updates: any = {};
            
            if (gAmount > 0) {
                updates.tokens = gAmount; // 🚀 OVERWRITE (Previous tokens wiped)
                const gExp = new Date();
                gExp.setDate(gExp.getDate() + (parseInt(generalExpiryDays) || 30));
                updates.tokensExpiry = gExp;
            }
            if (eAmount > 0) {
                updates.eyeconTokens = eAmount; // 🚀 OVERWRITE (Previous tokens wiped)
                const eExp = new Date();
                eExp.setDate(eExp.getDate() + (parseInt(eyeconExpiryDays) || 30));
                updates.eyeconTokensExpiry = eExp;
            }

            await userRef.update(updates);

            // Fetch user email for logs
            const userDoc = await userRef.get();
            const userData = userDoc.data();

            // Log
            if (gAmount > 0) await logTokenTransaction({ from: "Pool", toEmail: userData?.email, amount: gAmount, type: "general", action: "issue_to_user", adminEmail: decoded.email });
            if (eAmount > 0) await logTokenTransaction({ from: "Pool", toEmail: userData?.email, amount: eAmount, type: "eyecon", action: "issue_to_user", adminEmail: decoded.email });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
