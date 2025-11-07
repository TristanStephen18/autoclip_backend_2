import { Router } from "express";
import * as MulterUtils from "../../utils/storage.ts";
import path from "path";
import fs from "fs/promises";
import { getVideoDuration } from "./duration.ts";
import { requireAuth } from "../../utils/authmiddleware.ts";
import { supabase, SUPABASE_BUCKET } from "./supabaseClient.ts";

const router = Router();

router.post(
  "/upload-video",
  requireAuth,
  MulterUtils.uploadMemory.single("video"),
  async (req, res) => {
    const userId = req.user?.userId;

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video uploaded" });
      }

      // ✅ 1. Prepare upload data
      const fileBuffer = req.file.buffer; // ✅ keep only this one
      const fileName = `${Date.now()}_${req.file.originalname.replace(/\s+/g, "_")}`;

      console.log("📤 Uploading video to Supabase Storage...");

      // ✅ 2. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(`user_${userId}/${fileName}`, fileBuffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        console.error("❌ Supabase upload failed:", uploadError);
        return res.status(500).json({ error: "Supabase upload failed", details: uploadError.message });
      }

      console.log("✅ Uploaded to Supabase successfully!");

      // ✅ 3. Generate a public URL
      const { data: publicUrlData } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(`user_${userId}/${fileName}`);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error("Failed to generate public URL from Supabase.");
      console.log("🌐 Public URL:", publicUrl);

      // ✅ 4. Get video duration (temporarily save buffer to /temp)
      const tempDir = path.join(process.cwd(), "temp");
      await fs.mkdir(tempDir, { recursive: true });
      const tempFilePath = path.join(tempDir, fileName);

      await fs.writeFile(tempFilePath, fileBuffer);
      const video_duration = await getVideoDuration(tempFilePath);
      await fs.unlink(tempFilePath).catch(() => {});


      // ✅ 6. Respond to client
      return res.status(200).json({
        message: "Video uploaded successfully ✔️",
        file: {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          storedAs: fileName,
          url: publicUrl,
          duration: video_duration,
        },
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      return res.status(500).json({
        error: "An error occurred while uploading the video ❗",
        details: err.message,
      });
    }
  }
);

export default router;
