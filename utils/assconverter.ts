import fs from "fs";
import path from "path";

export const convertSrtToAss = (srtPath: string) => {
  const srtContent = fs.readFileSync(srtPath, "utf-8");
  const assPath = path.join(path.dirname(srtPath), path.basename(srtPath, ".srt") + ".ass");

  const assHeader = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
Collisions: Normal
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H0000FFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,3,0,2,20,20,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const assEvents = srtContent
    .split(/\n\s*\n/) // split blocks
    .map(block => {
      const lines = block.split("\n").map(l => l.trim());
      if (lines.length < 2) return "";

      const timeLine = lines[1];
      const textLines = lines.slice(2);
      const [start, end] = timeLine.split(" --> ").map(convertSrtTimeToAss);

      const text = textLines.join("\\N").replace(/,/g, "，"); // avoid commas breaking format
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    })
    .filter(Boolean)
    .join("\n");

  fs.writeFileSync(assPath, `${assHeader}\n${assEvents}`);
  return assPath;
};

// ✅ Converts SRT time (00:00:01,230) → ASS time (0:00:01.23)
function convertSrtTimeToAss(srtTime: string) {
  const [h, m, rest] = srtTime.split(":");
  const [s, ms] = rest.split(",");
  const totalSeconds = parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s + "." + ms);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const centiseconds = Math.floor((totalSeconds % 1) * 100)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${centiseconds}`;
}
