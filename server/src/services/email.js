import nodemailer from "nodemailer";

export async function sendOtpEmail({ to, otp, purpose }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Email delivery is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.");
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  const isReset = purpose === "password_reset";
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: isReset ? "LifeFlow password reset code" : "Verify your LifeFlow email",
    text: `Your LifeFlow ${isReset ? "password reset" : "email verification"} code is ${otp}. It expires in 5 minutes. If you did not request this, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;border:1px solid #e2e8f0;border-radius:16px"><h2 style="color:#C8102E">LifeFlow</h2><p>Your ${isReset ? "password reset" : "email verification"} code is:</p><div style="font-size:32px;letter-spacing:8px;font-weight:bold;padding:18px;background:#f8fafc;border-radius:10px;text-align:center">${otp}</div><p>This code expires in <b>5 minutes</b>. If you did not request it, ignore this email.</p></div>`
  });
}
