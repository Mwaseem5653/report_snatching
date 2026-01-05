// lib/uploadHelper.ts
export async function uploadFileToStorage(file: File, folder: string = "applications"): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

  if (!cloudName || !uploadPreset) {
    console.error("Missing Cloudinary configuration");
    throw new Error("Missing Cloudinary configuration");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Upload failed");

  return data.secure_url; // ye hi image URL hoga
}
