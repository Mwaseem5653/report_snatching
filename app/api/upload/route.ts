import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/firebaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Optional: Only allow authenticated users OR implement public rate limiting
    // For this project, Normal User Form is public, so we allow it but restrict size/type
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return NextResponse.json({ error: "File too large (Max 5MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    let bucketName = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`).replace("gs://", "").trim();
    let bucket = adminStorage.bucket(bucketName);
    const fileName = `${folder}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const fileRef = bucket.file(fileName);

    try {
        await fileRef.save(buffer, { metadata: { contentType: file.type } });
    } catch (err: any) {
        // If 404 and we were using .firebasestorage.app, try .appspot.com
        if (err.code === 404 && bucketName.endsWith(".firebasestorage.app")) {
            const fallbackBucketName = `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
            console.log(`⚠️ Primary bucket not found, trying fallback: ${fallbackBucketName}`);
            bucket = adminStorage.bucket(fallbackBucketName);
            const fallbackFileRef = bucket.file(fileName);
            await fallbackFileRef.save(buffer, { metadata: { contentType: file.type } });
            // Update bucket for public URL
            bucketName = fallbackBucketName;
        } else {
            throw err;
        }
    }

    // Try to make public
    try {
        await adminStorage.bucket(bucketName).file(fileName).makePublic();
    } catch (e) {
        console.warn("Could not make file public via ACL.");
    }
    
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    return NextResponse.json({ success: true, url: publicUrl });

  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
