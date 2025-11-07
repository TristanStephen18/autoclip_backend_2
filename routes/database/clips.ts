import express from "express";
import { eq, and } from "drizzle-orm";
import { clips } from "../../shared/schema.ts";
import { db } from "../../shared/db.ts";
import { requireAuth } from "../../utils/authmiddleware.ts";

const router = express.Router();

interface CreateClipInput {
  userId: number;
  clipUrl: string;
  description: string;
  duration: number;
  jobId: string;
}

interface CreatedClip {
  clipId: number;
  userId: number;
  jobId: string;
  duration: number;
  clipUrl: string;
  createdAt: Date;
  description: string;
}

export async function createClip(input: CreateClipInput): Promise<CreatedClip> {
  try {
    const newClip = {
      userId: input.userId,
      clipUrl: input.clipUrl,
      description: input.description,
      duration: input.duration,
      jobId: input.jobId
    };

    const [insertedClip] = await db.insert(clips).values(newClip).returning();

    if (!insertedClip) {
      throw new Error("Failed to insert clip");
    }

    return insertedClip;
  } catch (error: any) {
    console.error("Error creating clip:", error);
    throw new Error(`Failed to create clip: ${error.message}`);
  }
}


router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const allClips = await db
      .select()
      .from(clips)
      .where(eq(clips.userId, Number(userId)));
    res.json(allClips);
  } catch (error: any) {
    console.error("Error fetching clips:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch clips", details: error.message });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const clipId = Number(req.params.id);

    const [clip] = await db
      .select()
      .from(clips)
      .where(and(eq(clips.clipId, clipId), eq(clips.userId, Number(userId))));

    if (!clip) return res.status(404).json({ error: "Clip not found" });

    res.json(clip);
  } catch (error: any) {
    console.error("Error fetching clip:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch clip", details: error.message });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const clipId = Number(req.params.id);
    const updates = req.body;

    const [updatedClip] = await db
      .update(clips)
      .set(updates)
      .where(and(eq(clips.clipId, clipId), eq(clips.userId, Number(userId))))
      .returning();

    if (!updatedClip) return res.status(404).json({ error: "Clip not found" });

    res.json(updatedClip);
  } catch (error: any) {
    console.error("Error updating clip:", error);
    res
      .status(500)
      .json({ error: "Failed to update clip", details: error.message });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const clipId = Number(req.params.id);

    const [deletedClip] = await db
      .delete(clips)
      .where(and(eq(clips.clipId, clipId), eq(clips.userId, Number(userId))))
      .returning();

    if (!deletedClip)
      return res.status(404).json({ error: "Clip not found or not yours" });

    res.json({ message: "Clip deleted successfully", deletedClip });
  } catch (error: any) {
    console.error("Error deleting clip:", error);
    res
      .status(500)
      .json({ error: "Failed to delete clip", details: error.message });
  }
});

export default router;
