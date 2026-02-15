import { supabaseAdmin } from "./supabaseAdmin";

/**
 * 🗑️ Server-side helper to delete a file from Supabase Storage.
 * @param filePath The path to the file in the 'khansahab' bucket.
 */
export async function deleteFileFromStorageServer(filePath: string): Promise<void> {
  if (!filePath || !supabaseAdmin) {
    if (!supabaseAdmin) console.error("Supabase Admin is not configured. Cannot delete file:", filePath);
    return;
  }

  try {
    const { error } = await supabaseAdmin.storage
      .from('khansahab')
      .remove([filePath]);

    if (error) throw error;
    console.log(`Successfully deleted file from Supabase: ${filePath}`);
  } catch (error: any) {
    console.error(`Error deleting file ${filePath} from Supabase:`, error);
  }
}