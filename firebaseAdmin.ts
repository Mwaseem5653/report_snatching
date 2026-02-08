import admin from "firebase-admin";

// 🚀 Fix MaxListenersExceededWarning
process.setMaxListeners(20);

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error("❌ Missing Firebase Admin Credentials in .env.local");
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();

// 🔐 Hash Config for Password Imports (SCRYPT)
export const hashConfig = {
  algorithm: "SCRYPT" as const,
  key: Buffer.from("/wdP0Emp60jj4QStQ+Fw8UBEW1xTT0Tskr6lCkaU7v9G1vL8CO6PM+V8TL2wJF/3NHCGLrwYr/ef7wbykMjkvw==", "base64"),
  saltSeparator: Buffer.from("Bw==", "base64"),
  rounds: 8,
  memoryCost: 14,
};
