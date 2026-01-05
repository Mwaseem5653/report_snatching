import admin from "firebase-admin";


if (!admin.apps.length) {
  const base64 = process.env.FIREBASE_PRIVATE_KEY;
  if (!base64) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64");
  const svc = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));

  // Ensure private_key is correctly formatted
  svc.private_key = svc.private_key.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert(svc),
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
