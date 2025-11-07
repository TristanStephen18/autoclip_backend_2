import ffmpeg from "fluent-ffmpeg";
import ffprobePath from "ffprobe-static";

ffmpeg.setFfmpegPath("ffmpeg");
ffmpeg.setFfprobePath(ffprobePath.path);

export function extractToWav(inputPath: string, outputPath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFrequency(16000)
      .audioChannels(1)
      .format("wav")
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .save(outputPath);
  });
}
