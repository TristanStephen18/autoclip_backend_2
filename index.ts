import express from "express";
import cors from "cors";
import ytRoute from "./routes/apis/yt.ts";
import AiClipperRoute from "./routes/apis/gemini.ts";
import uploadRoutes from "./routes/utils/upload.ts";
import authRoutes from "./routes/database/auth.ts";
import transcribeRoute from "./routes/apis/whispercpp.ts";
import jobsRoute from "./routes/database/jobs.ts";
import clipsRoutes from "./routes/database/clips.ts";
import zipRoute from "./routes/utils/zip.ts";
import path from "path";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import Ffmpegroute from "./ffmpegrenderingtrial.ts";
import enhanceRoute from "./routes/enhanceRoute.ts";
import session from "express-session";
import passport from 'passport';
import GoogleRoutes  from "./routes/google.ts";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));

app.use(bodyParser.json({ limit: "500mb" }));
app.use(bodyParser.urlencoded({ limit: "500mb", extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
  })
);


app.use(passport.initialize());
app.use(passport.session());
//routes

app.use("/api/yt", ytRoute);
app.use("/api/ai", AiClipperRoute);
app.use("/api/upload", uploadRoutes);
// app.use('/api/elevenlabs', elevenLabsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/whisper", transcribeRoute);
app.use("/api/jobs", jobsRoute);
app.use("/api/clips", clipsRoutes);
app.use("/api/zip", zipRoute);
app.use(`/api/ffmpeg`, Ffmpegroute);
app.use(`/api/authenticate`, GoogleRoutes);
app.use('/api/enhance', enhanceRoute);

//static routes
app.use(
  "/videos",
  express.static(path.join(process.cwd(), "./server/public/videos"))
);

app.use(
  "/generated",
  express.static(path.join(process.cwd(), "./server/public/generated"))
);

app.get("/api/hello", (req, res) => {
  res.send("hello from the server");
});

app.listen(3000, () => {
  console.log("server is listening on port", 3000);
});
