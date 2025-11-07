import { ensureWhisperReady } from "../config/whisper.ts";

(async () => {
  console.log("📦 Installing Whisper.cpp and model...");
  await ensureWhisperReady();
  console.log("✅ Whisper is ready to use!");
})();
