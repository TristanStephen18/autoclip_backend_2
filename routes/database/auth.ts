import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq, and } from "drizzle-orm";
// import { config.JWT_EXPIRES_IN, config.JWT_SECRET } from "./config.ts";
import * as config from '../../config.ts';
import { requireAuth } from "../../utils/authmiddleware.ts";
import { users } from "../../shared/schema.ts";
import { db } from "../../shared/db.ts";
import { sendEmailVerification, sendOtpEmail } from "../apis/nodemailer.ts";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash,
        profilePicture: "pfp.jpg",
        verified: false,
      })
      .returning();

    const protocol = req.protocol;
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;
    await sendEmailVerification(newUser.id, email, baseUrl);

    res.json({ message: "Signup successful. Please verify your email." });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/verify", async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Invalid verification link" });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: number };

    await db
      .update(users)
      .set({ verified: true })
      .where(eq(users.id, decoded.userId));

    res.redirect("/login?verified=true");
  } catch (err) {
    console.error("Verification error:", err);
    res.status(400).json({ error: "Invalid or expired token" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    if (!user.verified) {
      return res
        .status(403)
        .json({ error: "Please verify your email before logging in." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.post("/google-login", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email ) {
      return res.status(400).json({ error: "Missing email" });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/", requireAuth, async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await db.select().from(users).where(eq(users.id, userId));

    res.json(user);
  } catch (err: any) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.put(
  "/update-profile-picture",
  requireAuth,
  async (req, res) => {
    const { profile_pic } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!existing) {
        return res.status(404).json({ error: "User not found" });
      }

      const [updated] = await db
        .update(users)
        .set({ profilePicture: profile_pic })
        .where(eq(users.id, Number(userId)))
        .returning();

      res.json({
        message: "User profile picture updated successfully",
        user: updated,
      });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "There was a problem updating your profile picture" });
    }
  }
);

router.put("/update-username", requireAuth, async (req, res) => {
  const { username } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }
    const [updated] = await db
      .update(users)
      .set({ name: username })
      .where(eq(users.id, Number(userId)))
      .returning();

    res.json({ message: "Username updated successfully", user: updated });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Thre was an error updating your username" });
  }
});

router.put("/update-password", requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const valid = await bcrypt.compare(oldPassword, user.passwordHash!);
    if (!valid) {
      return res.status(400).json({ error: "Old password is incorrect" });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, Number(userId)));

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  const { newPassword, email } = req.body;

  if (!newPassword || !email) {
    return res.status(401).json({ error: "Missing input fields" });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.email, String(email)));

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(401).json({ message: "Email is missing" });
  }

  try {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }
    const otp = await sendOtpEmail(email);
    res.json({ message: "success", token: otp });
  } catch (err) {
    console.error("Otp not sent: ", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/verify-otp", async (req, res) => {
  const { email, otp, otpToken } = req.body;

  if (!email || !otp || !otpToken) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const decoded = jwt.verify(otpToken, config.JWT_SECRET) as { email: string; otp: string };

    if (decoded.email !== email) {
      return res.status(400).json({ error: "Email does not match token" });
    }

    if (decoded.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const resetToken = jwt.sign({ email }, config.JWT_SECRET, { expiresIn: "15m" });

    res.json({
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (err: any) {
    console.error("OTP verification error:", err);
    return res.status(400).json({ error: "Invalid or expired OTP token" });
  }
});


export default router;