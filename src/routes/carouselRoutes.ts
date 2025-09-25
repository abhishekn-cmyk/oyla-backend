import express from "express";
import {
  createCarousel,
  updateCarousel,
  deleteCarousel,
  getActiveCarousels,
  getAllCarousels,
  getCarouselById,
} from "../controllers/Carouselcontroller";
import { protect } from "../middleware/protect";
import { requireUser, requireSuperAdmin } from "../middleware/auth";
import { upload } from "../middleware/upload";
const router = express.Router();

// ------------------ Admin Routes ------------------
// Create a carousel slide (Admin only)
router.post("/", protect, requireSuperAdmin,upload.single('image'), createCarousel);

// Update a carousel slide by ID (Admin only)
router.put("/:id", protect, requireSuperAdmin,upload.single('image'), updateCarousel);

// Delete a carousel slide by ID (Admin only)
router.delete("/:id", protect, requireSuperAdmin, deleteCarousel);

// ------------------ Public / User Routes ------------------
// Get all active carousel slides (for users)
router.get("/active", getActiveCarousels);

// Get all carousel slides (Admin only)
router.get("/", protect, requireSuperAdmin, getAllCarousels);

// Get a carousel slide by ID (Admin only)
router.get("/:id", protect, requireSuperAdmin, getCarouselById);

export default router;
