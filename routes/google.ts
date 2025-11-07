import { Router } from "express";
import passport from "passport";
import pkg from "passport-google-oauth20";
import type { Profile } from "passport-google-oauth20";
import { users } from "../shared/schema.ts";
import { db } from "../shared/db.ts";
import { eq } from "drizzle-orm";
import * as config from "../config.ts";
import jwt from "jsonwebtoken";

const { Strategy: GoogleStrategy } = pkg;

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173"; // your frontend origin

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "https://autoclipbackend.onrender.com/api/authenticate/google/callback",
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: (error: any, user?: any) => void
    ) => {
      try {
        // Here you would normally check if the user exists in DB
        // For demo purposes, we’ll just return the profile
        const user = {
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0].value,
          photo: profile.photos?.[0].value,
        };

        // Simulate DB call / user creation
        console.log("✅ Google user:", user);
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, String(user.email)));

        if (existing.length > 0) {
          console.log("Account already in use proceeding to login");
        } else {
          await db
            .insert(users)
            .values({
              email: String(user.email),
              name: user.name,
              provider: "google",
              passwordHash: "",
              profilePicture: user.photo,
              verified: true,
            })
            .returning();
        }

        return done(null, user);
      } catch (err) {
        return done(err, undefined);
      }
    }
  )
);

// ----------------------------
// 🧭 Passport Session Handling
// ----------------------------
passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

// ----------------------------
// 🚀 Routes
// ----------------------------

// Step 1: Start Google Login
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${CLIENT_URL}/auth?error=google_failed`,
    session: true,
  }),
  (req, res) => {
    const email = (req.user as any)?.email;
    const name = (req.user as any)?.name;
    const encodedEmail = encodeURIComponent(email);

    res.redirect(`${CLIENT_URL}/loading?email=${encodedEmail}`);
  }
);

// Step 3: Get current logged user (optional)
router.get("/google/user", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  res.json(req.user);
});

// Step 4: Logout route
router.get("/google/logout", (req, res) => {
  req.logout(() => {
    res.redirect(CLIENT_URL);
  });
});

export default router;
