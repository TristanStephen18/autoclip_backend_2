// server/src/routes/ytClipRoute.ts
import { Router } from "express";
import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createClip } from "../database/clips.ts";
import cloudinary from "../utils/cloudinaryClient.ts";
import { Readable } from "stream";
dotenv.config();

const router = Router();
ffmpeg.setFfmpegPath("ffmpeg");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const publicPath = path.join(process.cwd(), "./server/public");
const videosPath = path.join(publicPath, "videos");
if (!fs.existsSync(videosPath)) fs.mkdirSync(videosPath, { recursive: true });

/**
 * Utility to download file from a URL to local path
 */
export async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file from ${url}`);

  const fileStream = fs.createWriteStream(dest);

  // Convert Web ReadableStream → Node Readable
  const nodeStream = Readable.fromWeb(res.body as any);

  await new Promise<void>((resolve, reject) => {
    nodeStream.pipe(fileStream);
    nodeStream.on("error", reject);
    fileStream.on("finish", resolve);
    fileStream.on("error", reject);
  });
}

async function waitForFileActive(
  fileId: string,
  fileSizeBytes?: string | number,
  minTimeout = 30000
) {
  // Convert string -> number safely
  const size =
    typeof fileSizeBytes === "string"
      ? parseInt(fileSizeBytes)
      : fileSizeBytes ?? 0;

  // Scale timeout: add ~5 seconds per 50 MB, capped at 10 minutes
  const timeoutMs = Math.min(
    Math.max(minTimeout, 30000 + (size / (50 * 1024 * 1024)) * 5000),
    10 * 60 * 1000
  ) + 20000;

  console.log(
    `⏳ Waiting up to ${Math.round(
      timeoutMs / 1000
    )} s for Gemini file activation...`
  );

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const file = await ai.files.get({ name: fileId });
    if (file.state === "ACTIVE") return file;
    if (file.state === "FAILED") throw new Error("File processing failed.");
    await new Promise((r) => setTimeout(r, 2000)); // poll every 2 s
  }
  throw new Error("Timed out waiting for Gemini file to become ACTIVE.");
}

function normalizeGeminiOutput(
  data: any,
  number_clips: number,
  variations: number,
  range: [number, number]
) {
  const minLen = range[0];
  const maxLen = range[1];

  if (!data.clips) data.clips = [];

  // ✅ Ensure required number of clips
  while (data.clips.length < number_clips) {
    data.clips.push({
      clip_id: data.clips.length + 1,
      variations: [],
    });
  }

  for (const clip of data.clips) {
    if (!Array.isArray(clip.variations)) clip.variations = [];

    // ✅ Ensure required number of variations
    while (clip.variations.length < variations) {
      const start = Math.random() * 100; // fallback timestamp
      const duration = Math.random() * (maxLen - minLen) + minLen;
      clip.variations.push({
        start,
        end: start + duration,
        reason: "Auto-filled variation due to missing Gemini data",
      });
    }

    // ✅ Clamp durations to user-defined range
    clip.variations = clip.variations.map((v: any) => {
      let start = Math.max(0, Number(v.start) || 0);
      let end = Math.max(start + minLen, Number(v.end) || start + minLen);
      let duration = end - start;

      // Regenerate if out of range
      if (duration < minLen || duration > maxLen) {
        const newDuration = Math.random() * (maxLen - minLen) + minLen;
        start = start; // keep start
        end = start + newDuration;
        v.reason = "Adjusted duration to fit range constraint.";
      }

      return { ...v, start, end };
    });
    console.log(
      `🎯 Normalized durations for clip ${clip.clip_id}:`,
      clip.variations.map((v: any) => (v.end - v.start).toFixed(2))
    );
  }

  return data;
}

export async function analyzeVideoWithGemini2(
  videoUrl: string,
  {
    prompt,
    range = [10, 30],
    number_clips = 1,
    variations = 1,
  }: {
    prompt: string;
    range?: [number, number];
    number_clips?: number;
    variations?: number;
  }
) {
  try {
    console.log("📤 Uploading video to Gemini...");

    // STEP 1: Download from Supabase signed URL
    const response = await fetch(videoUrl);
    if (!response.ok)
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    const blob = await response.blob();

    // STEP 2: Upload to Gemini Files API
    const uploadedFile = await ai.files.upload({ file: blob });
    if (!uploadedFile?.uri)
      throw new Error("Failed to upload video to Gemini.");
    console.log("✅ Uploaded video to Gemini:", uploadedFile.uri);

    console.log("⏳ Waiting for Gemini to activate uploaded file...");
    const activeFile = await waitForFileActive(
      uploadedFile.name as string,
      uploadedFile.sizeBytes // even though it's a string
    );
    console.log("✅ Video ready:", activeFile.uri);

    // STEP 3: Build intelligent prompt
    const geminiPrompt = `
You are an expert AI video editor.

Your task:
Analyze the following video and extract EXACTLY ${number_clips} clips.
Each clip must have EXACTLY ${variations} variations.

Each variation:
- MUST have a duration >= ${range[0]} and <= ${range[1]} seconds.
- The value (end - start) MUST strictly satisfy this range. Do not exceed ${range[1]}.
- If the model finds a longer scene, cut it into smaller segments that each satisfy the duration rule.
- Example: if a scene is 25s long and max is 10s, produce 3 smaller clips of 8–10s each.
- Must include a short "reason" string explaining the choice.

If you cannot find enough valid clips, fill the missing ones with random segments that still follow the duration rules.

Return ONLY valid JSON in this exact structure (no markdown, no text outside JSON):
{
  "clips": [
    {
      "clip_id": 1,
      "variations": [
        { "start": <float>, "end": <float>, "reason": "<string>" }
      ]
    }
  ]
}`;

    console.log("🧠 Sending video to Gemini for analysis...");

    // STEP 4: Generate content with Gemini
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: [
        {
          role: "user",
          parts: [
            { text: geminiPrompt },
            {
              fileData: {
                fileUri: uploadedFile.uri,
                mimeType: "video/mp4",
              },
            },
          ],
        },
      ],
    });

    // ✅ STEP 5: Extract text safely
    const textOutput = result.text ?? "";
    if (!textOutput.trim()) throw new Error("Gemini returned no text output.");

    console.log("📩 Gemini raw response:", textOutput);

    // 🧹 STEP 6: Extract JSON safely
    const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Gemini returned no valid JSON object.");
    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("❌ Failed to parse Gemini output:", jsonMatch[0]);
      throw new Error("Gemini returned invalid JSON.");
    }

    // ✅ STEP 7: Normalize Gemini output
    const normalized = normalizeGeminiOutput(
      parsed,
      number_clips,
      variations,
      range
    );

    console.log("🎯 Final normalized clip structure:", normalized);

    return normalized;
  } catch (err: any) {
    console.error("❌ Gemini analysis error:", err);
    throw new Error(`Gemini analysis failed: ${err.message}`);
  }
}

/**
 * Generates actual clips using FFmpeg + Cloudinary.
 */
export async function generateClipsFromGemini(
  geminiData: any,
  videoUrl: string,
  {
    userId,
    jobId,
  }: {
    userId: number;
    jobId: string;
  }
) {
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log("🗂️ Created temp directory:", tempDir);
  }

  const results: any[] = [];

  // Flatten Gemini clips → array of all variations
  const allVariations = geminiData.clips.flatMap((clip: any) =>
    clip.variations.map((v: any) => ({
      start: v.start,
      end: v.end,
      reason: v.reason,
    }))
  );

  console.log(`🎞️ Generating ${allVariations.length} clips...`);

  for (let i = 0; i < allVariations.length; i++) {
    const { start, end, reason } = allVariations[i];
    const duration = Math.max(1, end - start);

    const timestamp = Date.now();
    const inputPath = path.join(tempDir, `input_${timestamp}_${i}.mp4`);
    const outputPath = path.join(tempDir, `clip_${timestamp}_${i}.mp4`);

    // ✅ 1. Download source video from Supabase (signed URL)
    console.log(`⬇️ Downloading video for clip ${i + 1}...`);
    await downloadFile(videoUrl, inputPath);

    // ✅ 2. Cut the clip using ffmpeg
    console.log(`✂️ Cutting clip ${i + 1} from ${start}s to ${end}s...`);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(start)
        .setDuration(duration)
        .output(outputPath)
        .outputOptions(["-c copy", "-avoid_negative_ts make_zero"])
        .on("end", () => resolve()) // ✅ Explicit callback wrapper
        .on("error", (err) => reject(err))
        .run();
    });

    console.log(`☁️ Uploading clip ${i + 1} to Cloudinary...`);
    const cloudinaryResult = await cloudinary.uploader.upload(outputPath, {
      resource_type: "video",
      folder: "AutoClip/Clips",
    });

    // ✅ 4. Save clip record to DB
    await createClip({
      jobId,
      userId,
      clipUrl: cloudinaryResult.secure_url,
      description: reason,
      duration: Math.floor(duration),
    });

    results.push({
      url: cloudinaryResult.secure_url,
      reason,
      start,
      end,
      duration,
    });

    // ✅ 5. Clean up temp files
    await fs.promises.unlink(inputPath).catch(() => {});
    await fs.promises.unlink(outputPath).catch(() => {});
  }

  return { success: true, clips: results };
}

export const analyzeVideoWithGemini3 = async (videoUrl: string) => {
  console.log("🎧 Starting Gemini transcription for:", videoUrl);

  try {
    // 1️⃣ Download video
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
    const blob = await response.blob();

    // 2️⃣ Upload to Gemini
    console.log("📤 Uploading video to Gemini Files API...");
    const uploadedFile = await ai.files.upload({ file: blob });
    if (!uploadedFile?.uri) throw new Error("Failed to upload video to Gemini");

    console.log("⏳ Waiting for Gemini file activation...");
    const activeFile = await waitForFileActive(uploadedFile.name as string, uploadedFile.sizeBytes);
    console.log("✅ File ready:", activeFile.uri);

    // 3️⃣ Ask Gemini to transcribe the FULL video
    const transcriptionPrompt = `
You are a precise video transcription and analysis model.

Task:
- Transcribe the *entire* audio from this video, from start to end.
- Return time-aligned captions covering 100% of spoken dialogue.
- Each caption should represent a short, coherent sentence or phrase.
- Include start and end timestamps in seconds.
- Do not skip or summarize content.
- Output only valid JSON:

{
  "captions": [
    { "start": <float>, "end": <float>, "text": "<string>" }
  ],
  "emojiMoments": [
    { "time": <float>, "emoji": "<string>" }
  ]
}
`;

    console.log("🧠 Sending video to Gemini (full model) for transcription...");

    const result = await ai.models.generateContent({
       model: "gemini-2.0-flash-001", // 👈 switch to a long-context model
      contents: [
        {
          role: "user",
          parts: [
            { text: transcriptionPrompt },
            {
              fileData: {
                fileUri: activeFile.uri,
               mimeType: "video/mp4;codecs=av01",
              },
            },
          ],
        },
      ],
    });

    // 4️⃣ Extract JSON output safely
    const textOutput = result.text ?? "";
    const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No valid JSON found in Gemini response.");

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.captions)) throw new Error("No captions found in Gemini output.");

    console.log(`✅ Transcribed ${parsed.captions.length} captions.`);
    return parsed;

  } catch (err: any) {
    console.error("❌ Gemini transcription error:", err);
    return {
      captions: [],
      emojiMoments: [],
      error: err.message,
    };
  }
};


export const generateSRT = (captions: { start: number; end: number; text: string }[]) => {
  return captions
    .map(
      (c, i) => `${i + 1}\n${formatTime(c.start)} --> ${formatTime(c.end)}\n${c.text}\n`
    )
    .join("\n");
};

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = (s % 60).toFixed(3);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${sec.replace(
    ".",
    ","
  )}`;
};


export default router;
