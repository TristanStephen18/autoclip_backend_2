import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import { analyzeVideoWithGemini3, generateSRT } from "../routes/apis/gemini.ts";
import { applyAudioMix, applyEmojiOverlay, applyKaraoke, cleanupTemp } from "../routes/utils/enhancements.ts";

export const processEnhancements = async (
  videoUrl: string,
  options: { karaoke: boolean; emojis: boolean; audio: boolean },
  audioUrl?: string
) => {
  const tmpDir = "./temp";
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  const inputPath = path.join(tmpDir, "input.mp4");
  const outputPath = path.join(tmpDir, "output.mp4");

  // Download Cloudinary video
  const response = await axios.get(videoUrl, { responseType: "arraybuffer" });
  fs.writeFileSync(inputPath, Buffer.from(response.data));

  // Analyze video via Gemini
  const geminiData = await analyzeVideoWithGemini3(videoUrl);

  let currentInput = inputPath;
  let currentOutput = outputPath;

  // Karaoke enhancement
  if (options.karaoke) {
    const srtPath = path.join(tmpDir, "subs.srt");
    fs.writeFileSync(srtPath, generateSRT(geminiData.captions));
    await applyKaraoke(currentInput, currentOutput, srtPath);
    // cleanupTemp(currentInput);
    fs.copyFileSync(currentOutput, inputPath);
  }

  // Emoji overlay
  if (options.emojis && geminiData.emojiMoments.length > 0) {
    const emojiPath = path.join(__dirname, "../../public/emoji.png");
    await applyEmojiOverlay(inputPath, outputPath, emojiPath, geminiData.emojiMoments[0].time);
    // cleanupTemp(inputPath);
    fs.copyFileSync(outputPath, inputPath);
  }

  // Audio enhancement
  if (options.audio && audioUrl) {
    const audioResp = await axios.get(audioUrl, { responseType: "arraybuffer" });
    const audioPath = path.join(tmpDir, "audio.mp3");
    fs.writeFileSync(audioPath, Buffer.from(audioResp.data));
    await applyAudioMix(inputPath, outputPath, audioPath);
    // cleanupTemp(inputPath);
    fs.copyFileSync(outputPath, inputPath);
  }

  // Upload to Cloudinary
  const uploaded = await cloudinary.uploader.upload(inputPath, {
    resource_type: "video",
    folder: "enhanced_clips",
  });

//   cleanupTemp(inputPath);
  return uploaded.secure_url;
};
