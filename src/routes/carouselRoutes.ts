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
import { authorize } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = express.Router();

// ------------------ Admin / SuperAdmin Routes ------------------
// Create a carousel slide (SuperAdmin only)
router.post("/", protect, authorize(["SuperAdmin"]), upload.single('image'), createCarousel);

// Update a carousel slide by ID (SuperAdmin only)
router.put("/:id", protect, authorize(["SuperAdmin"]), upload.single('image'), updateCarousel);

// Delete a carousel slide by ID (SuperAdmin only)
router.delete("/:id", protect, authorize(["SuperAdmin"]), deleteCarousel);

// ------------------ Public / User Routes ------------------
// Get all active carousel slides (for users)
router.get("/active", getActiveCarousels);

// Get all carousel slides (SuperAdmin only)
router.get("/", protect, authorize(["SuperAdmin"]), getAllCarousels);

// Get a carousel slide by ID (SuperAdmin only)
router.get("/:id", protect, authorize(["SuperAdmin"]), getCarouselById);

export default router;
