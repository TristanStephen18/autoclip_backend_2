import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { convertSrtToAss } from "../../utils/assconverter.ts";

export const applyKaraoke = async (inputPath: string, outputPath: string, srtPath: string) => {
  return new Promise<void>((resolve, reject) => {
    const assPath = convertSrtToAss(srtPath);

    // Make everything absolute
    const inputAbs = path.resolve(inputPath);
    const outputAbs = path.resolve(outputPath);
    let ffmpegAssPath = path.resolve(assPath).replace(/\\/g, "/");

    if (ffmpegAssPath[1] === ":") ffmpegAssPath = ffmpegAssPath.replace(":", "\\:");

    console.log("🎬 FFmpeg input:", inputAbs);
    console.log("💾 FFmpeg output:", outputAbs);
    console.log("📝 FFmpeg ASS file:", ffmpegAssPath);

    ffmpeg()
      .input(inputAbs)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-vf", `ass='${ffmpegAssPath}'`, "-y"])
      .on("start", cmd => console.log("🎬 FFmpeg karaoke cmd:", cmd))
      .on("stderr", line => console.log("🧾 FFmpeg log:", line))
      .on("error", err => {
        console.error("❌ FFmpeg karaoke error:", err.message);
        reject(err);
      })
      .on("end", () => {
        console.log("✅ Karaoke subtitles burned successfully!");
        console.log("📍 Output at:", outputAbs);
        resolve();
      })
      .save(outputAbs);
  });
};

export const applyAudioMix = async (input: string, output: string, audio: string) => {
  return new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(input)
      .input(audio)
      .complexFilter("[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2")
      .outputOptions(["-c:v copy", "-shortest"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(output);
  });
};

export const applyEmojiOverlay = async (
  inputPath: string,
  outputPath: string,
  emojiPath: string,
  timestamp: number
) => {
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .input(emojiPath)
      .complexFilter([
        `[0:v][1:v] overlay=W-w-20:H-h-20:enable='between(t,${timestamp},${timestamp + 3})'`
      ])
      .videoCodec("libx264")
      .audioCodec("aac")
      .on("start", (cmd) => console.log("FFmpeg emoji cmd:", cmd))
      .on("stderr", (line) => console.log("FFmpeg log:", line))
      .on("error", ()=> reject)
      .on("end", ()=>resolve)
      .save(outputPath);
  });
};
export const cleanupTemp = (filePath: string) => {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};
