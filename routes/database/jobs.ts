import express from "express";
import { eq, and } from "drizzle-orm";
import { clips, jobs } from "../../shared/schema.ts";
import { db } from "../../shared/db.ts";
import { requireAuth } from "../../utils/authmiddleware.ts";
import {
  analyzeVideoWithGemini2,
  generateClipsFromGemini,
} from "../apis/gemini.ts";
import { getSignedVideoUrl } from "../utils/getSignedUrl.ts";
import { deleteSupabaseFile } from "../apis/uploadToSupabase.ts";
import { extractPublicId } from "../../utils/cloudinarypublicidextractor.ts";
import { deleteCloudinaryAsset } from "../apis/uploadToCloudinary.ts";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    console.log(userId);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const newJob = { ...req.body, userId };

    const [insertedJob] = await db.insert(jobs).values(newJob).returning();

    res.status(201).json(insertedJob);
  } catch (error: any) {
    console.error("Error creating job:", error);
    res
      .status(500)
      .json({ error: "Failed to create job", details: error.message });
  }
});

/**
 * ✅ Get all jobs for the authenticated user
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    console.log(userId);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const allJobs = await db.select().from(jobs).where(eq(jobs.userId, userId));
    res.json(allJobs);
  } catch (error: any) {
    console.error("Error fetching jobs:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch jobs", details: error.message });
  }
});

/**
 * ✅ Get a specific job (only if it belongs to the user)
 */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    console.log(userId);
    const jobId = req.params.id;

    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, Number(userId))));

    if (!job) return res.status(404).json({ error: "Job not found" });

    res.json(job);
  } catch (error: any) {
    console.error("Error fetching job:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch job", details: error.message });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    console.log(userId);
    const jobId = req.params.id;
    const updates = req.body;

    const [updatedJob] = await db
      .update(jobs)
      .set(updates)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, Number(userId))))
      .returning();

    if (!updatedJob) return res.status(404).json({ error: "Job not found" });

    res.json(updatedJob);
  } catch (error: any) {
    console.error("Error updating job:", error);
    res
      .status(500)
      .json({ error: "Failed to update job", details: error.message });
  }
});

/**
 * ✅ Delete a job (only if it belongs to the user)
 */
router.delete("/:id", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  console.log(userId);
  const jobId = req.params.id;

  try {
    // 1️⃣ Fetch job
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, Number(userId))));

    if (!job) {
      return res.status(404).json({ error: "Job not found or not yours" });
    }

    // 2️⃣ (Optional) — if you still want to block completed jobs
    // Remove this block if users can delete completed jobs
    // if (job.status === "completed") {
    //   return res.status(403).json({ error: "Cannot delete a completed job" });
    // }

    // 3️⃣ Find all clips associated with the job
    const jobClips = await db
      .select()
      .from(clips)
      .where(eq(clips.jobId, jobId));

    // 4️⃣ Delete Cloudinary clips first (if they exist)
    if (jobClips.length > 0) {
      for (const clip of jobClips) {
        if (clip.clipUrl) {
          try {
            const publicId = extractPublicId(clip.clipUrl);
            await deleteCloudinaryAsset(publicId);
          } catch (err) {
            console.warn(
              `Failed to delete Cloudinary clip: ${clip.clipUrl}`,
              err
            );
          }
        }
      }

      // 5️⃣ Delete clip records from DB
      await db.delete(clips).where(eq(clips.jobId, jobId));
    }

    // 6️⃣ Delete Supabase-stored video (if exists)
    if (job.videoUrl) {
      try {
        const filePath = decodeURIComponent(
          job.videoUrl.split("/public/")[1].replace("videos/", "")
        );
        await deleteSupabaseFile(filePath.replace("videos/", ""));
      } catch (err) {
        console.warn(`Failed to delete Supabase video for job ${jobId}`, err);
      }
    }

    // 7️⃣ Finally, delete the job record
    const [deletedJob] = await db
      .delete(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, Number(userId))))
      .returning();

    return res.json({
      message: "Job and all associated clips deleted successfully",
      deletedJob,
    });
  } catch (error: any) {
    console.error("Error deleting job:", error);
    return res.status(500).json({
      error: "Failed to delete job",
      details: error.message,
    });
  }
});

// router.post("/:id/start", requireAuth, async (req, res) => {
//   const userId = req.user?.userId;
// console.log(userId);
//   const jobId = String(req.params.id);

//   try {
//     // 1️⃣ Validate job ownership
//     const [job] = await db
//       .select()
//       .from(jobs)
//       .where(and(eq(jobs.id, jobId), eq(jobs.userId, Number(userId))));

//     if (!job)
//       return res.status(404).json({ error: "Job not found or not yours" });

//     await db
//       .update(jobs)
//       .set({ status: "processing", progress: 0 })
//       .where(eq(jobs.id, jobId));

//     console.log("🎧 Starting transcription for:", job.videoUrl);
//     const transcript = await transcribeFile(job.videoUrl, true);
//     await db.update(jobs).set({ progress: 40 }).where(eq(jobs.id, jobId));

//     console.log("🎬 Generating clips from transcript...");
//     const generatedClips = await generateClips(transcript, {
//       number_clips: Number(job.clipsPerVideo),
//       prompt: job.aiInstructions,
//       range: [Number(job.clipLengthMin), Number(job.clipLengthMax)],
//       userId: userId,
//       variations: job.variationsPerClip,
//       videoPath: job.videoUrl,
//       jobId: job.id
//     });
//     await db.update(jobs).set({ progress: 80 }).where(eq(jobs.id, jobId));

//     // 6️⃣ Mark job completed
//     await db
//       .update(jobs)
//       .set({
//         status: "completed",
//         progress: 100,
//         clipsGenerated: generatedClips?.clips.length
//       })
//       .where(eq(jobs.id, jobId));

//     console.log("✅ Job completed:", jobId);
//     res.json({
//       message: "Job processed successfully",
//       clips: generatedClips?.clips,
//     });
//   } catch (error: any) {
//     console.error("❌ Error processing job:", error);
//     await db.update(jobs).set({ status: "failed" }).where(eq(jobs.id, jobId));
//     res
//       .status(500)
//       .json({ error: "Job processing failed", details: error.message });
//   }
// });

router.post("/new/:id/start", requireAuth, async (req, res) => {
  const userId = req.user?.userId;
  console.log(userId);
  const jobId = String(req.params.id);

  try {
    // 1️⃣ Fetch job and verify ownership
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, Number(userId))));

    if (!job) {
      return res.status(404).json({ error: "Job not found or not yours" });
    }

    // 2️⃣ Mark job as processing
    await db
      .update(jobs)
      .set({ status: "processing", progress: 0 })
      .where(eq(jobs.id, jobId));

    // 3️⃣ Get a signed Supabase video URL (temporary)
    const signedUrl = await getSignedVideoUrl(job.videoUrl);
    console.log("🎥 Got signed URL from Supabase:", signedUrl);

    // 4️⃣ Analyze video with Gemini
    console.log("🎬 Analyzing with Gemini...");
    const geminiData = await analyzeVideoWithGemini2(signedUrl, {
      prompt: job.aiInstructions,
      range: [Number(job.clipLengthMin), Number(job.clipLengthMax)],
      number_clips: Number(job.clipsPerVideo),
      variations: Number(job.variationsPerClip),
    });

    await db.update(jobs).set({ progress: 40 }).where(eq(jobs.id, jobId));

    // 5️⃣ Generate video clips from Gemini data
    console.log("✂️ Generating clips...");
    const generated = await generateClipsFromGemini(geminiData, signedUrl, {
      userId: userId as number,
      jobId,
    });

    // 6️⃣ Update final job info
    await db
      .update(jobs)
      .set({
        status: "completed",
        progress: 100,
        clipsGenerated: generated.clips.length,
      })
      .where(eq(jobs.id, jobId));

    res.json({ success: true, clips: generated.clips });
  } catch (err: any) {
    console.error("❌ Error processing job:", err);
    await db.update(jobs).set({ status: "failed" }).where(eq(jobs.id, jobId));

    res.status(500).json({ error: "Job failed", details: err.message });
  }
});

export default router;
