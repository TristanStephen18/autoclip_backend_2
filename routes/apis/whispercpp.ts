import { Router } from "express";
import { transcribeFile } from "../../config/whisper.ts";

const router = Router();

router.post("/transcribe", async (req, res) => {
  try {
    const { filePath, captions = false } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: "Missing filePath in body" });
    }

    console.log("🎧 Transcribing:", filePath);

    const result = await transcribeFile(filePath, captions);

    res.json({ success: true, result });
  } catch (err: any) {
    console.error("❌ Transcription error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
