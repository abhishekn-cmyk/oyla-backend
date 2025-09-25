import express from "express";
import {
  getSuccessStories,
  createSuccessStory,
  deleteSuccessStory,
  getSuccessStoryById,
  updateSuccessStory,
} from "../controllers/successController";
import { protect } from "../middleware/protect";
import { requireSuperAdmin } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = express.Router();

// -------------------- PUBLIC ROUTES --------------------
router.get("/", getSuccessStories);         // get all stories
router.get("/:id", getSuccessStoryById);    // get story by ID

// -------------------- PROTECTED ROUTES --------------------
// Only logged-in + super admin can create, update, delete
router.post(
  "/",
  protect,
  requireSuperAdmin,
  upload.single("image"), // upload single image
  createSuccessStory
);

router.put(
  "/:id",
  protect,
  requireSuperAdmin,
  upload.single("image"),
  updateSuccessStory
);

router.delete(
  "/:id",
  protect,
  requireSuperAdmin,
  deleteSuccessStory
);

export default router;
