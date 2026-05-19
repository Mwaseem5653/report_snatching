import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary for server-side operations
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * 🗑️ Server-side helper to delete a file from Cloudinary.
 * @param publicId The public_id of the file in Cloudinary.
 */
export async function deleteFileFromStorageServer(publicId: string): Promise<void> {
  if (!publicId) return;

  try {
    // Determine resource_type: 'raw' for excel/csv, 'image' for others
    // Cloudinary needs to know if it's a raw file (like Excel) to delete it correctly
    const isRaw = publicId.match(/\.(xlsx|xls|csv|pdf)$/i);
    const resourceType = isRaw ? "raw" : "image";

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    
    if (result.result === "ok") {
      console.log(`Successfully deleted file from Cloudinary: ${publicId}`);
    } else {
      console.warn(`Cloudinary deletion result for ${publicId}:`, result);
    }
  } catch (error: any) {
    console.error(`Error deleting file ${publicId} from Cloudinary:`, error);
  }
}