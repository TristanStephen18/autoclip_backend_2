import fs from "fs";
import path from "path";
import { supabase, SUPABASE_BUCKET } from "../utils/supabaseClient.ts";

export async function uploadVideoToSupabase(filePath: string) {
  try {
    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    console.log(`☁️ Uploading ${fileName} to Supabase bucket: ${SUPABASE_BUCKET}`);

    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(`videos/${fileName}`, fileBuffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: "video/mp4",
      });

    if (error) throw error;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(`videos/${fileName}`);

    console.log(`✅ Uploaded to Supabase: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.error("❌ Supabase upload error:", err.message);
    throw err;
  }
}


export const deleteSupabaseFile = async (filePath: string) => {
  try {
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove([filePath]);
    if (error) throw error;
    console.log(`🗑️ Deleted file from Supabase: ${filePath}`);
  } catch (error) {
    console.error("❌ Supabase delete error:", error);
  }
};