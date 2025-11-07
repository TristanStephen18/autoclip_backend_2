import { getVideoDurationInSeconds } from "get-video-duration";

export const getVideoDuration = async (filePath: string): Promise<number> => {
  try {
    const duration = await getVideoDurationInSeconds(filePath);
    return Math.round(duration); // ⏱ Round to nearest whole second
  } catch (err) {
    console.error("❌ Failed to get video duration:", err);
    return 0;
  }
};