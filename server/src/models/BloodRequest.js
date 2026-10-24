import mongoose from "mongoose";

const schema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  patientName: { type: String, required: true, maxlength: 100 },
  bloodGroup: { type: String, enum: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], required: true },
  units: { type: Number, min: 1, max: 20, required: true },
  urgency: { type: String, enum: ["normal", "urgent", "critical"], default: "normal" },
  hospitalName: { type: String, required: true, maxlength: 150 },
  address: { type: String, required: true, maxlength: 300 },
  location: { lat: Number, lng: Number },
  status: { type: String, enum: ["pending", "matched", "donor_en_route", "fulfilled", "cancelled"], default: "pending" },
  matchedDonors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

export default mongoose.model("BloodRequest", schema);
