import express from "express";
import {
  addFreeze,
  updateFreeze,
  cancelFreeze,
  deleteFreeze,
  getFreezeById,
  getFreezesByUser
} from "../controllers/freezeController";

import { protect } from "../middleware/protect";
import { requireUser, requireSuperAdmin } from "../middleware/auth";

const router = express.Router();

// -------------------- USER ROUTES -------------------- //
// Add a freeze (user can add for themselves)
router.post("/:userId", protect, requireUser, addFreeze);

// Get all freezes for the logged-in user
router.get("/:userId", protect, requireUser, getFreezesByUser);

// Get a specific freeze by ID for the logged-in user
router.get("/:userId/:id", protect, requireUser, getFreezeById);

// Update a freeze by ID (user can update their own freeze)
router.put("/:userId/:id", protect, requireUser, updateFreeze);

// Cancel a freeze (soft update status)
router.patch("/:userId/:id/cancel", protect, requireUser, cancelFreeze);

// Delete a freeze (user can delete their own freeze)
router.delete("/:userId/:id", protect, requireUser, deleteFreeze);

// -------------------- SUPERADMIN ROUTES -------------------- //
// Add a freeze for any user
router.post("/superadmin/:userId", protect, requireSuperAdmin, addFreeze);

// Get all freezes for any user
router.get("/superadmin/:userId", protect, requireSuperAdmin, getFreezesByUser);

// Get a single freeze by ID for any user
router.get("/superadmin/:userId/:id", protect, requireSuperAdmin, getFreezeById);

// Update a freeze for any user
router.put("/superadmin/:userId/:id", protect, requireSuperAdmin, updateFreeze);

// Cancel a freeze for any user
router.patch("/superadmin/:userId/:id/cancel", protect, requireSuperAdmin, cancelFreeze);

// Delete a freeze for any user
router.delete("/superadmin/:userId/:id", protect, requireSuperAdmin, deleteFreeze);

export default router;
