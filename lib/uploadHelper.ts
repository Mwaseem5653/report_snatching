// lib/uploadHelper.ts

import { getApiUrl } from "@/lib/utils";

/**
 * 📁 Uploads a file directly to Cloudinary.
 * Using Unsigned Uploads to bypass server limits and Supabase blocks.
 */
export async function uploadFileToStorage(file: File, folder: string = "applications"): Promise<{ secure_url: string; public_id: string }> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default";

  if (!cloudName) {
    throw new Error("Cloudinary Cloud Name is not configured in environment variables.");
  }

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || "Failed to upload to Cloudinary");
    }

    return { 
        secure_url: data.secure_url, 
        public_id: data.public_id // Cloudinary uses public_id for deletion
    };
  } catch (error: any) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error(error.message || "Failed to upload file to Cloudinary.");
  }
}

/**
 * 🗑️ Client-side helper to delete a file from Cloudinary via our API.
 */
export async function deleteFileFromStorage(publicId: string): Promise<void> {
    try {
        const res = await fetch(getApiUrl("/api/upload/delete"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicId }),
        });
        if (!res.ok) {
            const data = await res.json();
            console.error("Failed to delete file:", data.error);
        }
    } catch (err) {
        console.error("Error calling delete API:", err);
    }
}