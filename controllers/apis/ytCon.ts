// import { Request, Response } from "express";
// import ytdlp from "yt-dlp-exec";

// /**
//  * Download YouTube video and stream it back to client
//  */
// export const downloadRoute = async (req: Request, res: Response) => {
//   const { url } = req.body;
//   if (!url) {
//     return res.status(400).json({ error: "No URL provided" });
//   }

//   try {
//     res.setHeader("Content-Disposition", "attachment; filename=video.mp4");
//     res.setHeader("Content-Type", "video/mp4");

//     // Stream video to response
//     const child = ytdlp.exec(url, {
//       format: "mp4",
//       output: "-", // send to stdout
//     });

//     child.stdout?.pipe(res);
//     child.stderr?.on("data", (data: any) => console.error(data.toString()));
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to download video" });
//   }
// };
