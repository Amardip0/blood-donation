import mongoose from "mongoose";

const schema = new mongoose.Schema({
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bloodGroup: { type: String, enum: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], required: true },
  units: { type: Number, min: 0, max: 10000, default: 0 }
}, { timestamps: true });
schema.index({ hospital: 1, bloodGroup: 1 }, { unique: true });
export default mongoose.model("Inventory", schema);
