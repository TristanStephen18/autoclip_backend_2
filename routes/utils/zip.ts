import { Router } from "express";
import path from "path";
import JSZip from "jszip";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffprobePath from "ffprobe-static";
import os from "os";

const router = Router();

ffmpeg.setFfmpegPath("ffmpeg");
ffmpeg.setFfprobePath(ffprobePath.path);

// Helper to re-encode video to safe H.264/AAC MP4
const ensurePlayableMp4 = async (inputPath: string, index: number): Promise<Buffer> => {
  const tempPath = path.join(os.tmpdir(), `reencoded_${index}_${Date.now()}.mp4`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-c:v libx264", // ensure video is H.264
        "-c:a aac",     // ensure audio is AAC
        "-movflags +faststart", // make MP4 streamable
      ])
      .output(tempPath)
      .on("end", () => {
        try {
          const buffer = fs.readFileSync(tempPath);
          fs.unlinkSync(tempPath);
          resolve(buffer);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err) => reject(err))
      .run();
  });
};

router.post("/download-all", async (req, res) => {
  try {
    const { job, clips } = req.body;
    if (!job || !clips || clips.length === 0)
      return res.status(400).json({ error: "Invalid request data" });

    const zip = new JSZip();
    const safeTitle = job.title.replace(/[^a-z0-9_\-]/gi, "_");

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const filePath = path.join(process.cwd(), `./server/public/${clip.clipUrl}`);

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Missing file: ${filePath}`);
        continue;
      }

      console.log(`🎬 Re-encoding clip ${i + 1}: ${filePath}`);

      try {
        const reencodedBuffer = await ensurePlayableMp4(filePath, i);
        zip.file(`${safeTitle}_clip_${i + 1}.mp4`, reencodedBuffer, { binary: true });
      } catch (err) {
        console.error(`❌ Failed to process clip ${i + 1}:`, err);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle}_Clips.zip"`
    );
    res.setHeader("Content-Type", "application/zip");
    res.send(zipBuffer);
  } catch (err) {
    console.error("❌ Error generating ZIP:", err);
    res.status(500).json({ error: "Error generating ZIP" });
  }
});

export default router;
