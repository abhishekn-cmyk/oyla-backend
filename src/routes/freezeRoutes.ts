import express from "express";
import {
  addFreeze,
  updateFreeze,
  cancelFreeze,
  deleteFreeze,
  getFreezeById,
  getFreezesByUser,
  getAllFreezes,
} from "../controllers/freezeController";

import { protect } from "../middleware/protect";
import { authorize } from "../middleware/auth";

const router = express.Router();

// -------------------- USER ROUTES -------------------- //
// Add a freeze (user can add for themselves)
router.post("/:userId", protect, authorize(["User"]), addFreeze);

// Get all freezes for the logged-in user
router.get("/:userId", protect, authorize(["User"]), getFreezesByUser);

// Get a specific freeze by ID for the logged-in user
router.get("/:userId/:id", protect, authorize(["User"]), getFreezeById);

// Update a freeze by ID (user can update their own freeze)
router.put("/:userId/:id", protect, authorize(["User"]), updateFreeze);

// Cancel a freeze (soft update status)
router.patch("/:userId/:id/cancel", protect, authorize(["User"]), cancelFreeze);

// Delete a freeze (user can delete their own freeze)
router.delete("/:userId/:id", protect, authorize(["User"]), deleteFreeze);

// -------------------- SUPERADMIN ROUTES -------------------- //
// Add a freeze for any user
router.post("/superadmin/:userId", protect, authorize(["SuperAdmin"]), addFreeze);

// Get all freezes for any user
router.get("/superadmin/:userId", protect, authorize(["SuperAdmin"]), getFreezesByUser);

// Get a single freeze by ID for any user
router.get("/superadmin/:userId/:id", protect, authorize(["SuperAdmin"]), getFreezeById);

// Update a freeze for any user
router.put("/superadmin/:userId/:id", protect, authorize(["SuperAdmin"]), updateFreeze);

// Cancel a freeze for any user
router.patch("/superadmin/:userId/:id/cancel", protect, authorize(["SuperAdmin"]), cancelFreeze);

// Delete a freeze for any user
router.delete("/superadmin/:userId/:id", protect, authorize(["SuperAdmin"]), deleteFreeze);
router.get('/all/all/full',protect,authorize(["SuperAdmin"]),getAllFreezes);
export default router;
