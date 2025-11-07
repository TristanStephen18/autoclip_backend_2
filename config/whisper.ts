import path from "path";
import fs from "fs";
import {
  installWhisperCpp,
  downloadWhisperModel,
  transcribe,
  toCaptions,
  type TranscriptionJson,
} from "@remotion/install-whisper-cpp";
import { extractToWav } from "../utils/audioextractor.ts";

export const MODEL = "medium";
export const WHISPER_FOLDER = path.join(process.cwd(), "whisper-data");

export async function ensureWhisperReady() {
  // Only install once
  if (!fs.existsSync(WHISPER_FOLDER)) {
    fs.mkdirSync(WHISPER_FOLDER, { recursive: true });
  }

  await installWhisperCpp({
    version: "1.6.0",
    to: WHISPER_FOLDER,
  });

  await downloadWhisperModel({
    model: MODEL,
    folder: WHISPER_FOLDER,
  });
}

export async function transcribeFile(filePath: string, returnCaptions = false) {
  const publiDir = path.join(process.cwd(), "./server/public");
  const finalFilePath = path.join(publiDir, filePath);
  if (!fs.existsSync(finalFilePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const tempDir = path.join(process.cwd(), "./server/public/temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempWav = path.join(
    tempDir,
    path.basename(filePath).replace(/\.[^/.]+$/, ".wav")
  );

  await extractToWav(finalFilePath, tempWav);

  const whisperOutput: TranscriptionJson<true> = await transcribe({
    inputPath: tempWav,
    whisperPath: WHISPER_FOLDER,
    whisperCppVersion: "1.6.0",
    model: MODEL,
    tokenLevelTimestamps: true,
    translateToEnglish: false,
    language: "auto", // auto-detect
  });

  fs.rmSync(tempDir, { recursive: true, force: true });

  if (returnCaptions) {
    const { captions } = toCaptions({ whisperCppOutput: whisperOutput });
    return captions;
  }

  const text = whisperOutput.transcription
    .map((segment) => segment.text)
    .join(" ");

  return text.trim();
}
