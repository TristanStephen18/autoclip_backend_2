import { supabase, SUPABASE_BUCKET } from "./supabaseClient.ts";


export async function getSignedVideoUrl(videoUrl: string): Promise<string> {
  try {
    // If it's already a public URL, just return it
    if (videoUrl.startsWith("http")) {
      return videoUrl;
    }

    // videoUrl should be a relative path like "videos/filename.mp4"
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(videoUrl, 60 * 60); // 1 hour

    if (error || !data?.signedUrl) {
      console.error("❌ Supabase signed URL error:", error);
      throw new Error("Failed to generate signed URL for Supabase video");
    }

    return data.signedUrl;
  } catch (err) {
    console.error("getSignedVideoUrl error:", err);
    throw err;
  }
}