import { Router } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import User from "../models/User.js";
import EmailOtp from "../models/EmailOtp.js";
import { requireAuth } from "../middleware/auth.js";
import { sendOtpEmail } from "../services/email.js";

const router = Router();
const cookieOptions = {
  httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
  maxAge: 15 * 60 * 1000, path: "/"
};
const issueAccess = (user) => jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
const hashOtp = otp => crypto.createHash("sha256").update(otp).digest("hex");
const makeOtp = () => crypto.randomInt(100000, 1000000).toString();

router.post("/register", [
  body("name").trim().isLength({ min: 2, max: 100 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 10, max: 128 }),
  body("role").optional().isIn(["donor", "seeker", "hospital"]),
  body("bloodGroup").optional({ nullable: true }).isIn(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { name, email, password, role = "donor", bloodGroup, phone } = req.body;
    if (await User.exists({ email })) return res.status(409).json({ message: "Email already registered" });
    // Registration deliberately does not require email OTP.
    const user = await User.create({
      name, email, phone, role, bloodGroup,
      passwordHash: await bcrypt.hash(password, 12),
      emailVerified: false
    });
    res.cookie("lf_access", issueAccess(user), cookieOptions);
    res.status(201).json({ user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      emailVerified: user.emailVerified, bloodGroup: user.bloodGroup
    } });
  } catch { res.status(500).json({ message: "Could not register account" }); }
});

router.post("/login", [
  body("email").isEmail().normalizeEmail(), body("password").isString().isLength({ min: 1, max: 128 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const user = await User.findOne({ email: req.body.email }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash)))
    return res.status(401).json({ message: "Invalid email or password" });
  if (user.suspended) return res.status(403).json({ message: "Account suspended" });
  res.cookie("lf_access", issueAccess(user), cookieOptions);
  res.json({ user: {
    id: user.id, name: user.name, email: user.email, role: user.role,
    bloodGroup: user.bloodGroup, emailVerified: Boolean(user.emailVerified)
  } });
});

router.post("/logout", (_req, res) => res.clearCookie("lf_access", {
  httpOnly: true, sameSite: "lax", path: "/"
}).json({ ok: true }));

router.get("/me", requireAuth, (req, res) => res.json({ user: {
  id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role,
  bloodGroup: req.user.bloodGroup, available: req.user.available,
  verified: req.user.verified, emailVerified: Boolean(req.user.emailVerified)
} }));

async function issueOtp(req, res, purpose) {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address" });
  const user = await User.findOne({ email });
  // Avoid exposing whether an account exists on password-reset requests.
  if (purpose === "password_reset" && !user) return res.json({ message: "If the account exists, an OTP email has been sent." });
  if (purpose === "email_verification" && (!req.user || req.user.email !== email))
    return res.status(403).json({ message: "You can verify only your signed-in account email" });
  if (purpose === "email_verification" && user?.emailVerified)
    return res.json({ message: "Email is already verified." });

  const recent = await EmailOtp.findOne({ email, purpose, createdAt: { $gt: new Date(Date.now() - 60_000) } });
  if (recent) return res.status(429).json({ message: "Please wait 60 seconds before requesting another code." });

  const otp = makeOtp();
  await EmailOtp.deleteMany({ email, purpose, consumedAt: { $exists: false } });
  await EmailOtp.create({ email, purpose, otpHash: hashOtp(otp), expiresAt: new Date(Date.now() + 5 * 60_000) });
  try {
    await sendOtpEmail({ to: email, otp, purpose });
    return res.json({ message: "If eligible, an OTP email has been sent. It expires in 5 minutes." });
  } catch (err) {
    await EmailOtp.deleteMany({ email, purpose, otpHash: hashOtp(otp) });
    console.error("OTP email delivery failed:", err.message);
    return res.status(503).json({ message: "Email delivery is not configured or is temporarily unavailable." });
  }
}

router.post("/forgot-password", [
  body("email").isEmail().normalizeEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: "Enter a valid email address" });
  return issueOtp(req, res, "password_reset");
});

router.post("/reset-password", [
  body("email").isEmail().normalizeEmail(),
  body("otp").matches(/^\d{6}$/),
  body("password").isLength({ min: 10, max: 128 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: "Enter a valid email, six-digit OTP and password of at least 10 characters." });
  const email = req.body.email.toLowerCase();
  const record = await EmailOtp.findOne({ email, purpose: "password_reset", consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
  if (!record) return res.status(400).json({ message: "OTP expired or not found. Request a new code." });
  if (record.attempts >= 5) return res.status(429).json({ message: "Too many attempts. Request a new code." });
  record.attempts += 1;
  if (record.otpHash !== hashOtp(req.body.otp)) {
    await record.save();
    return res.status(400).json({ message: "Incorrect OTP." });
  }
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "OTP expired or not found. Request a new code." });
  user.passwordHash = await bcrypt.hash(req.body.password, 12);
  await user.save();
  record.consumedAt = new Date();
  await record.save();
  await EmailOtp.deleteMany({ email, purpose: "password_reset", _id: { $ne: record._id } });
  res.clearCookie("lf_access", { httpOnly: true, sameSite: "lax", path: "/" });
  res.json({ message: "Password reset successful. Please sign in with your new password." });
});

router.post("/send-verification-otp", requireAuth, async (req, res) => issueOtp(req, res, "email_verification"));

router.post("/verify-email", requireAuth, [
  body("otp").matches(/^\d{6}$/)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: "Enter the six-digit OTP." });
  const email = req.user.email;
  const record = await EmailOtp.findOne({ email, purpose: "email_verification", consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
  if (!record) return res.status(400).json({ message: "OTP expired or not found. Request a new code." });
  if (record.attempts >= 5) return res.status(429).json({ message: "Too many attempts. Request a new code." });
  record.attempts += 1;
  if (record.otpHash !== hashOtp(req.body.otp)) {
    await record.save();
    return res.status(400).json({ message: "Incorrect OTP." });
  }
  req.user.emailVerified = true;
  await req.user.save();
  record.consumedAt = new Date();
  await record.save();
  res.json({ message: "Email verified successfully.", emailVerified: true });
});

export default router;
