import { Router } from "express";
import {
  createRestaurant,
  getRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
  addProductToMenu,
  addProductToPopularMenu,
} from "../controllers/restaruntController";

import { protect } from "../middleware/protect";
import { authorize } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

// ----------------- PUBLIC ROUTES -----------------
router.get("/", getRestaurants); // Get all restaurants
router.get("/:id", getRestaurantById); // Get restaurant by ID

// ----------------- PROTECTED ROUTES (SUPERADMIN ONLY) -----------------
router.post("/", protect, authorize(["superadmin"]), upload.single("image"), createRestaurant);
router.put("/:id", protect, authorize(["superadmin"]), upload.single("image"), updateRestaurant);
router.delete("/:id", protect, authorize(["superadmin"]), upload.single("image"), deleteRestaurant);

// Add products to restaurant
router.post("/:restaurantId/menu", protect, authorize(["superadmin"]), upload.single("image"), addProductToMenu);
router.post("/:restaurantId/popularMenu", protect, authorize(["superadmin"]), upload.single("image"), addProductToPopularMenu);

export default router;
