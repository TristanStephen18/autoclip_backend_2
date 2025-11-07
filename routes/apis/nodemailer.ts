import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import * as config from '../../config.ts'

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmailVerification(userId: number, email: string, baseUrl: string) {
  const token = jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: "1h" });
  const url = `${baseUrl}/api/auth/verify?token=${token}`;

  try {
    await transporter.sendMail({
      from: '"AutoClip Farm" <no-reply@viralmotion.com>',
      to: email,
      subject: "Verify Your Email",
      text: `Click this link to verify your account: ${url}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Email Verification</h2>
          <p>Please click the button below to verify your account:</p>
          <p>
            <a href="${url}" 
               style="display: inline-block; background-color: #4CAF50; color: white; 
                      padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Verify Email
            </a>
          </p>
          <p>If the button doesn’t work, copy and paste this link:</p>
          <p><a href="${url}">${url}</a></p>
        </div>
      `,
    });
  } catch (error: any) {
    console.error("Email send error:", error.message);
  }
}

export async function sendOtpEmail(email: string): Promise<string | null> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const otpToken = jwt.sign({ email, otp }, config.JWT_SECRET, { expiresIn: "10m" });

  try {
    await transporter.sendMail({
      from: '"AutoClip Farm" <no-reply@viralmotion.com>',
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; text-align: center;">
          <h2>Your OTP Code</h2>
          <p>Use the following OTP to reset your password. It will expire in <strong>10 minutes</strong>.</p>
          <div style="font-size: 24px; font-weight: bold; margin: 20px 0; color: #4CAF50;">
            ${otp}
          </div>
          <p>If you didn’t request this, please ignore this email.</p>
        </div>
      `,
    });

    return otpToken; 
  } catch (error: any) {
    console.error("OTP send error:", error.message);
    return null;
  }
}