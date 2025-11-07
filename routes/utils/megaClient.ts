import { Storage } from "megajs";
import dotenv from "dotenv";

dotenv.config();

export const mega = new Storage({
  email: process.env.MEGA_EMAIL!,
  password: process.env.MEGA_PASSWORD!,
});

export const connectMega = async (): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    mega.on("ready", () => {
      console.log("✅ MEGA storage ready");
      resolve();
    });
    (mega as any).on("error", (err: any) => {
      console.error("❌ MEGA init failed:", err);
      reject(err);
    });
  });
};
