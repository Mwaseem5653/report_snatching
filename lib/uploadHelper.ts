// lib/uploadHelper.ts

import { supabase } from "./supabaseClient";

/**
 * 📁 Uploads a file directly to Supabase Storage.
 * This supports large files (up to 1GB free tier) and bypasses Vercel limits.
 */
export async function uploadFileToStorage(file: File, folder: string = "applications"): Promise<{ secure_url: string; public_id: string }> {
  if (!supabase) {
    throw new Error("Supabase Storage is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.");
  }
  try {
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('khansahab') // Correct bucket name
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('khansahab')
      .getPublicUrl(filePath);

    return { secure_url: publicUrl, public_id: filePath };
  } catch (error: any) {
    console.error("Supabase Upload Error:", error);
    throw new Error(error.message || "Failed to upload file to Supabase.");
  }
}

/**
 * 🗑️ Client-side helper to delete a file from Cloudinary via our API.
 */
export async function deleteFileFromStorage(publicId: string): Promise<void> {
    try {
        const res = await fetch("/api/upload/delete", {
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