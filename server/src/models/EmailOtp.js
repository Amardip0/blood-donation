import mongoose from "mongoose";

const schema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  purpose: { type: String, enum: ["password_reset", "email_verification"], required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  attempts: { type: Number, default: 0 },
  consumedAt: Date
}, { timestamps: true });

schema.index({ email: 1, purpose: 1, createdAt: -1 });
export default mongoose.model("EmailOtp", schema);
