import { Router } from "express";
import { body, validationResult } from "express-validator";
import BloodRequest from "../models/BloodRequest.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { canDonateTo } from "../utils/blood.js";

const router = Router();
router.use(requireAuth);

router.post("/", [
  body("patientName").trim().isLength({ min: 2, max: 100 }),
  body("bloodGroup").isIn(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]),
  body("units").isInt({ min: 1, max: 20 }),
  body("urgency").optional().isIn(["normal", "urgent", "critical"]),
  body("hospitalName").trim().isLength({ min: 2, max: 150 }),
  body("address").trim().isLength({ min: 4, max: 300 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const item = await BloodRequest.create({ ...req.body, requester: req.user.id });
    if (item.urgency === "critical") {
      const donors = await User.find({ role: "donor", available: true, suspended: false, verified: true });
      const matches = donors.filter(d => canDonateTo(d.bloodGroup, item.bloodGroup));
      item.matchedDonors = matches.map(d => d._id);
      await item.save();
      req.app.get("io").emit("critical-request", {
        requestId: item.id, bloodGroup: item.bloodGroup, urgency: item.urgency,
        hospitalName: item.hospitalName, donorIds: matches.map(d => d.id)
      });
    }
    res.status(201).json({ request: item });
  } catch { res.status(500).json({ message: "Could not create request" }); }
});

router.get("/mine", async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { requester: req.user.id };
  res.json({ requests: await BloodRequest.find(filter).sort({ createdAt: -1 }).limit(200) });
});

router.patch("/:id/status", async (req, res) => {
  if (!["admin", "hospital"].includes(req.user.role)) return res.status(403).json({ message: "Insufficient permissions" });
  if (!["pending", "matched", "donor_en_route", "fulfilled", "cancelled"].includes(req.body.status))
    return res.status(400).json({ message: "Invalid status" });
  const item = await BloodRequest.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!item) return res.status(404).json({ message: "Request not found" });
  req.app.get("io").emit("request-status", { requestId: item.id, status: item.status });
  res.json({ request: item });
});
export default router;
