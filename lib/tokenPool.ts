import { adminDb } from "@/firebaseAdmin";

const SYSTEM_DOC = "system/tokens";

export async function getTokenPool() {
    const doc = await adminDb.doc(SYSTEM_DOC).get();
    if (!doc.exists) {
        return { eyeconPool: 0, generalPool: 0 };
    }
    return doc.data() as { eyeconPool: number; generalPool: number };
}

export async function updateTokenPool(eyeconAmount: number, generalAmount: number) {
    await adminDb.doc(SYSTEM_DOC).set({
        eyeconPool: eyeconAmount,
        generalPool: generalAmount
    }, { merge: true });
}

export async function logTokenTransaction(data: {
    from: string;
    toEmail: string;
    amount: number;
    type: "eyecon" | "general";
    action: "issue" | "add_to_pool";
    adminEmail: string;
}) {
    await adminDb.collection("token_logs").add({
        ...data,
        timestamp: new Date()
    });
}

export async function deductFromPool(amount: number, type: "eyecon" | "general") {
    const pool = await getTokenPool();
    const field = type === "eyecon" ? "eyeconPool" : "generalPool";
    const current = pool[field] || 0;
    
    if (current < amount) {
        throw new Error(`Insufficient tokens in System Pool. Current ${type} pool: ${current}`);
    }

    await adminDb.doc(SYSTEM_DOC).update({
        [field]: current - amount
    });
}
