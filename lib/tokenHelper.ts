import { adminDb } from "@/firebaseAdmin";

export async function checkAndDeductTokens(uid: string, role: string, amount: number) {
    console.log(`[TokenHelper] Attempting deduction: UID=${uid}, Role=${role}, Amount=${amount}`);

    // 1. ONLY Super Admin is exempt
    if (role === "super_admin") {
        console.log(`[TokenHelper] Super Admin detected. Skipping deduction.`);
        return { success: true };
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        console.error(`[TokenHelper] User document NOT FOUND for UID: ${uid}`);
        return { success: false, error: "User profile not found in system." };
    }

    const userData = userDoc.data();
    console.log(`[TokenHelper] User Found: ${userData?.name}, Current Tokens: ${userData?.tokens}, HasAccess: ${userData?.hasToolsAccess}`);
    
    // 2. Check for Advanced Tools Access
    if (!userData?.hasToolsAccess) {
        console.warn(`[TokenHelper] Access Denied for ${userData?.name}: hasToolsAccess is false`);
        return { success: false, error: "Access Denied: Advanced Tools Permission Required. Contact Super Admin." };
    }

    // 3. Check for sufficient tokens
    const currentTokens = Number(userData?.tokens || 0);
    if (currentTokens < amount) {
        console.warn(`[TokenHelper] Insufficient tokens for ${userData?.name}: Has ${currentTokens}, Needs ${amount}`);
        return { success: false, error: `Insufficient Credits. Required: ${amount}, Current Balance: ${currentTokens}. Please request top-up.` };
    }

    // 4. Deduct tokens
    const newBalance = currentTokens - amount;
    
    try {
        await userRef.update({
            tokens: newBalance
        });
        console.log(`✅ [TokenHelper] SUCCESS: User=${userData?.name}, Role=${role}, Deducted=${amount}, NewBalance=${newBalance}`);
        return { success: true, newBalance };
    } catch (updateErr: any) {
        console.error(`❌ [TokenHelper] Firestore Update FAILED:`, updateErr);
        return { success: false, error: "Internal Database Error during deduction." };
    }
}
