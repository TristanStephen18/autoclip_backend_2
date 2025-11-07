import { Router } from "express";
import path from "path";
import JSZip from "jszip";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffprobePath from "ffprobe-static";
import os from "os";
import ytdlp from "yt-dlp-exec";
import { uploadVideoToSupabase } from "./uploadToSupabase.ts";

const router = Router();

ffmpeg.setFfmpegPath("ffmpeg");
ffmpeg.setFfprobePath(ffprobePath.path);

const publicPath = path.join(process.cwd(), "./server/public");
const videosPath = path.join(publicPath, "videos");

const ensurePlayableMp4 = async (
  inputPath: string,
  index: number
): Promise<Buffer> => {
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const dir = path.dirname(inputPath);

  const possibleAudioFiles = [
    path.join(dir, `${baseName}.m4a`),
    path.join(dir, `${baseName}_audio.m4a`),
    path.join(dir, `${baseName}_audio.mp4`),
  ];

  const audioPath = possibleAudioFiles.find(fs.existsSync);
  const tempPath = path.join(
    os.tmpdir(),
    `reencoded_${index}_${Date.now()}.mp4`
  );

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();

    if (audioPath) {
      console.log(`🎧 Found audio track for ${baseName}, merging...`);
      cmd.input(inputPath).input(audioPath);
      cmd.outputOptions([
        "-c:v libx264",
        "-c:a aac",
        "-shortest",
        "-movflags +faststart",
      ]);
    } else {
      console.log(
        `🎬 No separate audio for ${baseName}, encoding video only...`
      );
      cmd.input(inputPath);
      cmd.outputOptions(["-c:v libx264", "-c:a aac", "-movflags +faststart"]);
    }

    cmd
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
      .save(tempPath);
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
      const filePath = path.join(
        process.cwd(),
        `./server/public/${clip.clipUrl}`
      );

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Missing file: ${filePath}`);
        continue;
      }

      console.log(`🎞 Processing clip ${i + 1}: ${filePath}`);
      try {
        const buffer = await ensurePlayableMp4(filePath, i);
        zip.file(`${safeTitle}_clip_${i + 1}.mp4`, buffer, { binary: true });
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
router.post("/convert", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });
  const cookiesPath = path.join(process.cwd(), "server", "cookies.txt");

  try {
    const timestamp = Date.now();

    const videoFile = path.join(videosPath, `video_${timestamp}.mp4`);
    const audioFile = path.join(videosPath, `audio_${timestamp}.m4a`);
    const finalFilename = `video_${timestamp}_final.mp4`;
    const finalFilepath = path.join(videosPath, finalFilename);

    if (!fs.existsSync(videosPath))
      fs.mkdirSync(videosPath, { recursive: true });

    console.log("📥 Downloading video stream...");
    await ytdlp(url, {
      format: "bestvideo[height<=720][ext=mp4]",
      output: videoFile,
      noWarnings: true,
      noPart: true,
      cookies: cookiesPath,
    });

    console.log("📥 Downloading audio stream...");
    await ytdlp(url, {
      format: "bestaudio[ext=m4a]",
      output: audioFile,
      noWarnings: true,
      noPart: true,
      cookies: cookiesPath,
    });

    console.log("🎬 Merging video + audio with ffmpeg...");
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(videoFile)
        .input(audioFile)
        .videoCodec("copy")
        .audioCodec("aac")
        .outputOptions(["-shortest", "-movflags +faststart"])
        .on("end", () => {
          console.log("✅ Merge complete:", finalFilepath);
          if (fs.existsSync(videoFile)) fs.unlinkSync(videoFile);
          if (fs.existsSync(audioFile)) fs.unlinkSync(audioFile);
          resolve();
        })
        .on("error", (err) => {
          console.error("❌ FFmpeg merge error:", err);
          reject(err);
        })
        .save(finalFilepath);
    });

    console.log("☁️ Uploading merged video to Supabase...");
    const supabaseUrl = await uploadVideoToSupabase(finalFilepath);

    // Clean up local file after upload
    if (fs.existsSync(finalFilepath)) {
      fs.unlinkSync(finalFilepath);
      console.log("🧹 Deleted local file:", finalFilepath);
    }

    // Get YouTube metadata
    const info: any = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      youtubeSkipDashManifest: true,
      cookies: cookiesPath,
    });

    res.json({
      success: true,
      title: info.title,
      thumbnail: info.thumbnail,
      supabaseUrl,
    });
  } catch (err) {
    console.error("❌ Convert error:", err);
    res.status(500).json({ error: "Conversion failed", details: String(err) });
  }
});

export default router;
