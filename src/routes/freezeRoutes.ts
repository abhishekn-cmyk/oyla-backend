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
router.post("/:userId", protect, authorize(["user"]), addFreeze);

// Get all freezes for the logged-in user
router.get("/:userId", protect, authorize(["user"]), getFreezesByUser);

// Get a specific freeze by ID for the logged-in user
router.get("/:userId/:id", protect, authorize(["user"]), getFreezeById);

// Update a freeze by ID (user can update their own freeze)
router.put("/:userId/:id", protect, authorize(["user"]), updateFreeze);

// Cancel a freeze (soft update status)
router.patch("/:userId/:id/cancel", protect, authorize(["user"]), cancelFreeze);

// Delete a freeze (user can delete their own freeze)
router.delete("/:userId/:id", protect, authorize(["user"]), deleteFreeze);

// -------------------- SUPERADMIN ROUTES -------------------- //
// Add a freeze for any user
router.post("/superadmin/:userId", protect, authorize(["superadmin"]), addFreeze);

// Get all freezes for any user
router.get("/superadmin/:userId", protect, authorize(["superadmin"]), getFreezesByUser);

// Get a single freeze by ID for any user
router.get("/superadmin/:userId/:id", protect, authorize(["superadmin"]), getFreezeById);

// Update a freeze for any user
router.put("/superadmin/:userId/:id", protect, authorize(["superadmin"]), updateFreeze);

// Cancel a freeze for any user
router.patch("/superadmin/:userId/:id/cancel", protect, authorize(["superadmin"]), cancelFreeze);

// Delete a freeze for any user
router.delete("/superadmin/:userId/:id", protect, authorize(["superadmin"]), deleteFreeze);

// Get all freezes (superadmin only)
router.get("/all/all/full", protect, authorize(["superadmin"]), getAllFreezes);

export default router;
