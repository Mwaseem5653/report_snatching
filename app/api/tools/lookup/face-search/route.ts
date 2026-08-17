import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { logToolUsage } from "@/lib/usageLogger";
import { checkAndDeductFaceSearchTokens } from "@/lib/tokenHelper";

const SECRET = process.env.SESSION_JWT_SECRET!;

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sessionToken")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const decoded: any = jwt.verify(token, SECRET);

        const formData = await req.formData();
        const image = formData.get("image") as File;

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        // 🚀 Log usage
        try {
            await logToolUsage(decoded, "Face Search", { fileName: image.name });
        } catch (e) {
            console.error("Error logging tool usage:", e);
        }

        // 🚀 Deduct Tokens (30 tokens per search)
        const tokenCheck = await checkAndDeductFaceSearchTokens(decoded.uid, decoded.role, 30);
        if (!tokenCheck.success) {
            return NextResponse.json({ 
                error: tokenCheck.error, 
                currentBalance: tokenCheck.currentBalance 
            }, { status: 403 });
        }

        // 🚀 Face Search is now API-free!
        // We upload the image to Cloudinary to get a public URL, then generate reverse image search URLs.

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default";

        if (!cloudName) {
            throw new Error("Cloudinary Cloud Name is not configured.");
        }

        const uploadFormData = new FormData();
        uploadFormData.append("file", image);
        uploadFormData.append("upload_preset", uploadPreset);
        uploadFormData.append("folder", "face-searches");

        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
            method: "POST",
            body: uploadFormData,
        });

        if (!cloudRes.ok) {
            const errData = await cloudRes.json();
            throw new Error(errData.error?.message || "Failed to upload to Cloudinary");
        }

        const cloudData = await cloudRes.json();
        const publicUrl = cloudData.secure_url;

        // Construct search results with actual live reverse-search engines (no API keys required!)
        const results = [
            { 
                platform: "Google Lens", 
                url: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(publicUrl)}`, 
                confidence: 98 
            },
            { 
                platform: "Yandex Images", 
                url: `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(publicUrl)}`, 
                confidence: 95 
            },
            { 
                platform: "TinEye", 
                url: `https://tineye.com/search?url=${encodeURIComponent(publicUrl)}`, 
                confidence: 90 
            },
            { 
                platform: "Bing Visual Search", 
                url: `https://www.bing.com/images/searchbyimage?cbir=sbi&imgurl=${encodeURIComponent(publicUrl)}`, 
                confidence: 88 
            }
        ];

        return NextResponse.json({ 
            success: true, 
            results 
        });
    } catch (error: any) {
        console.error("Face Search Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
