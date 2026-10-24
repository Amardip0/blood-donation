import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: "" },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["donor", "seeker", "hospital", "admin"], default: "donor" },
  bloodGroup: { type: String, enum: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] },
  weightKg: { type: Number, min: 35, max: 300 },
  address: { type: String, maxlength: 300, default: "" },
  location: { lat: { type: Number, min: -90, max: 90 }, lng: { type: Number, min: -180, max: 180 } },
  available: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  suspended: { type: Boolean, default: false },
  lastDonationAt: Date,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
