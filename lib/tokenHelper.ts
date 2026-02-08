import { adminDb } from "@/firebaseAdmin";

export async function checkAndDeductTokens(uid: string, role: string, amount: number) {
    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        return { success: false, error: "User profile not found in system." };
    }

    const userData = userDoc.data();
    
    const permissions = userData?.permissions || {};
    const hasAnyPermission = Object.values(permissions).some(v => v === true);
    const hasAccess = userData?.hasToolsAccess || hasAnyPermission || role === "super_admin";

    if (!hasAccess) {
        return { success: false, error: "Access Denied: Advanced Tools Permission Required. Contact Super Admin." };
    }

    // 🚀 Super Admin bypasses token deduction
    if (role === "super_admin") {
        return { success: true, newBalance: Number(userData?.tokens || 0) };
    }

    const currentTokens = Number(userData?.tokens || 0);
    if (currentTokens < amount) {
        return { success: false, error: `Insufficient Credits. Required: ${amount}, Current Balance: ${currentTokens}. Please request top-up.` };
    }

    // Deduct tokens
    const newBalance = currentTokens - amount;
    
    try {
        await userRef.update({
            tokens: newBalance
        });
        return { success: true, newBalance };
    } catch (updateErr: any) {
        return { success: false, error: "Internal Database Error during deduction." };
    }
}

export async function checkAndDeductEyeconTokens(uid: string, role: string, amount: number) {
    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return { success: false, error: "User profile not found." };

    const userData = userDoc.data();
    const currentTokens = Number(userData?.eyeconTokens || 0);

    if (currentTokens < amount) {
        return { success: false, error: `Insufficient Eyecon Tokens. Required: ${amount}, Balance: ${currentTokens}.` };
    }

    try {
        const newBalance = currentTokens - amount;
        await userRef.update({ eyeconTokens: newBalance });
        return { success: true, newBalance };
    } catch (err) {
        return { success: false, error: "Database error during Eyecon deduction." };
    }
}
