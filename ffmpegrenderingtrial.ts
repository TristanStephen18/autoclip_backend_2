import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { Router } from "express";
import { fileURLToPath } from "url"; // ✅ Needed for ESM __dirname fix

// ✅ Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

router.post("/render", async (req, res) => {
  try {
    const { filename, start, end, brightness, contrast, text } = req.body;

    // Ensure input and output folders exist
    const videosDir = path.join(__dirname, "uploads");
    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const inputPath = path.join(videosDir, filename);
    const outputPath = path.join(outputDir, `output-${Date.now()}.mp4`);

    // Build FFmpeg filters dynamically
    const videoFilter = [
      `eq=brightness=${(brightness - 100) / 200}:contrast=${contrast / 100}`,
      text
        ? `drawtext=text='${text}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`
        : null,
    ]
      .filter(Boolean)
      .join(",");

    // Run FFmpeg
    ffmpeg(inputPath)
      .setStartTime(start)
      .setDuration(end - start)
      .videoFilter(videoFilter)
      .output(outputPath)
      .on("end", () => {
        try {
          const fileBuffer = fs.readFileSync(outputPath);
          res.setHeader("Content-Type", "video/mp4");
          res.send(fileBuffer);
          fs.unlinkSync(outputPath); // cleanup temp file
        } catch (e) {
          console.error("Error sending file:", e);
          res.status(500).send("Error processing video output");
        }
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        res.status(500).send("Render failed");
      })
      .run();
  } catch (err) {
    console.error("Request error:", err);
    res.status(400).send("Invalid request");
  }
});
router.post("/render-quote", async (req, res) => {
  try {
    const {
      quote,
      author,
      backgroundImage,
      fontFamily = "Arial",
      fontColor = "white",
      fontSize = 1,
    } = req.body;

    if (!backgroundImage) return res.status(400).send("Missing background image.");

    const outputDir = path.join(__dirname, "../output");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `quote-${Date.now()}.mp4`);

    const fontPath =
      process.platform === "win32"
        ? "C:/Windows/Fonts/arial.ttf"
        : "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";

    const fontOption = fs.existsSync(fontPath) ? `fontfile='${fontPath}':` : "";

    // Sanitize input
    const clean = (t: string) => t.replace(/[:'"\\]/g, "").replace(/\n/g, " ").trim();
    const safeQuote = clean(quote);
    const safeAuthor = clean(author);

    // Dynamic font sizing (based on user scale)
    const baseQuoteSize = 48 * fontSize;
    const baseAuthorSize = 32 * fontSize;

    const videoFilters = [
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      // Draw quote (centered)
      `drawtext=${fontOption}text='${safeQuote}':fontcolor=${fontColor}:fontsize=${baseQuoteSize}:x=(w-text_w)/2:y=(h/2-text_h/2)`,
      // Draw author below quote
      `drawtext=${fontOption}text='— ${safeAuthor}':fontcolor=${fontColor}:fontsize=${baseAuthorSize}:x=(w-text_w)/2:y=(h/2+text_h*2)`,
    ].join(",");

    console.log("🎬 Filters:", videoFilters);

    ffmpeg()
      .input(backgroundImage)
      .loop(5)
      .videoFilters(videoFilters)
      .outputOptions(["-t", "5", "-pix_fmt", "yuv420p"])
      .output(outputPath)
      .on("start", (cmd) => console.log("▶ FFmpeg started:", cmd))
      .on("stderr", (line) => console.log("FFmpeg:", line))
      .on("end", () => {
        console.log("✅ Render complete:", outputPath);
        const buffer = fs.readFileSync(outputPath);
        res.setHeader("Content-Type", "video/mp4");
        res.send(buffer);
        fs.unlinkSync(outputPath);
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err.message);
        res.status(500).send("Render failed: " + err.message);
      })
      .run();
  } catch (err: any) {
    console.error("🔥 Server error:", err);
    res.status(500).send("Render failed: " + err.message);
  }
});


export default router;
