import express from "express";
import {
  getSuccessStories,
  createSuccessStory,
  deleteSuccessStory,
  getSuccessStoryById,
  updateSuccessStory,
} from "../controllers/successController";
import { protect } from "../middleware/protect";
import { authorize } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = express.Router();

// -------------------- PUBLIC ROUTES --------------------
router.get("/", getSuccessStories);         // get all stories
router.get("/:id", getSuccessStoryById);    // get story by ID

// -------------------- PROTECTED ROUTES --------------------
// Only logged-in + SuperAdmin can create, update, delete
router.post(
  "/",
  protect,
  authorize(["SuperAdmin"]),
  upload.single("image"), // upload single image
  createSuccessStory
);

router.put(
  "/:id",
  protect,
  authorize(["SuperAdmin"]),
  upload.single("image"),
  updateSuccessStory
);

router.delete(
  "/:id",
  protect,
  authorize(["SuperAdmin"]),
  deleteSuccessStory
);

export default router;
