import express from "express";
import { processEnhancements } from "../service/enhancementservice.ts";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { videoUrl, enhancements, audioUrl } = req.body;
    if (!videoUrl) return res.status(400).json({ error: "Missing videoUrl" });

    const finalUrl = await processEnhancements(videoUrl, enhancements, audioUrl);
    res.json({ success: true, enhancedVideoUrl: finalUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Processing failed" });
  }
});

export default router;
