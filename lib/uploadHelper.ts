// lib/uploadHelper.ts

/**
 * 📁 Uploads a file directly to Cloudinary.
 * Make sure to add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and 
 * NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to your .env.local
 */
export async function uploadFileToStorage(file: File, folder: string = "applications"): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary configuration missing. Please add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env.local");
  }

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Upload failed");
    }

    return data.secure_url;
  } catch (error: any) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error(error.message || "Failed to upload file to Cloudinary.");
  }
}