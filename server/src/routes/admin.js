import { Router } from "express";
import User from "../models/User.js";
import BloodRequest from "../models/BloodRequest.js";
import Inventory from "../models/Inventory.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, allowRoles("admin"));

router.get("/overview", async (_req, res) => {
  const [totalDonors, activeRequests, inventory, successfulMatches] = await Promise.all([
    User.countDocuments({ role: "donor" }),
    BloodRequest.countDocuments({ status: { $in: ["pending", "matched", "donor_en_route"] } }),
    Inventory.aggregate([{ $group: { _id: "$bloodGroup", units: { $sum: "$units" } } }]),
    BloodRequest.countDocuments({ status: "fulfilled" })
  ]);
  res.json({ totalDonors, activeRequests, inventory, successfulMatches });
});
router.get("/users", async (_req, res) => res.json({ users: await User.find().select("-passwordHash").sort({ createdAt: -1 }).limit(500) }));
router.patch("/users/:id", async (req, res) => {
  const allowed = {};
  if (typeof req.body.suspended === "boolean") allowed.suspended = req.body.suspended;
  if (typeof req.body.verified === "boolean") allowed.verified = req.body.verified;
  if (["donor", "seeker", "hospital", "admin"].includes(req.body.role)) allowed.role = req.body.role;
  if (!Object.keys(allowed).length) return res.status(400).json({ message: "No valid changes supplied" });
  const user = await User.findByIdAndUpdate(req.params.id, allowed, { new: true }).select("-passwordHash");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user });
});
export default router;
