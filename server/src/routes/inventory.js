import { Router } from "express";
import { body, validationResult } from "express-validator";
import Inventory from "../models/Inventory.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";

const router = Router();
router.get("/", async (_req, res) => res.json({ inventory: await Inventory.find().populate("hospital", "name") }));
router.put("/:bloodGroup", requireAuth, allowRoles("hospital", "admin"), [
  body("units").isInt({ min: 0, max: 10000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const groups = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
  if (!groups.includes(req.params.bloodGroup)) return res.status(400).json({ message: "Invalid blood group" });
  const hospital = req.user.role === "admin" && req.body.hospitalId ? req.body.hospitalId : req.user.id;
  const item = await Inventory.findOneAndUpdate(
    { hospital, bloodGroup: req.params.bloodGroup }, { units: Number(req.body.units) },
    { upsert: true, new: true, runValidators: true }
  );
  req.app.get("io").emit("inventory-updated", { bloodGroup: item.bloodGroup, units: item.units, hospitalId: String(item.hospital) });
  res.json({ inventory: item });
});
export default router;
