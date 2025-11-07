// import { Router } from "express";
// import * as config from "../../config.ts";
// import fs from "fs";
// import path from "path";

// const router = Router();

// const videoDirectory = path.join(process.cwd(), "./server/public");

// router.post("/transcibe", async (req, res) => {
//   const { fileurl } = req.body;
//   if (!fileurl) {
//     res.status(400).json({ message: "error", details: "Missing fileurl" });
//   }
//   try {
//     const file = fs.createReadStream(path.join(videoDirectory, fileurl));

//     const transcription = await config.client.speechToText.convert({
//       file,
//       model_id: "scribe_v1",
//       timestamps_granularity: "word",
//     });

//     if (!transcription) {
//       console.error("There was an error encountered");
//     } else {
//       console.log(transcription);
//       res.json({
//         message: "success",
//         transcription,
//       });
//     }
//   } catch (error: any) {
//     res
//       .status(500)
//       .json({ message: "error", details: `There was an error encountered: ${error.message}` });
//   }
// });

// export default router;
