import { Router } from "express";
import {
  createRestaurant,
  getRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
  addProductToMenu,
  addProductToPopularMenu
} from "../controllers/restaruntController";

import { requireSuperAdmin } from "../middleware/auth";
import { requireUser } from "../middleware/auth";
import { protect } from "../middleware/protect";
import { upload } from "../middleware/upload";
const router = Router();

router.post("/", protect,requireSuperAdmin,upload.single("image"),createRestaurant);
router.get("/", getRestaurants);
router.get("/:id", getRestaurantById);
router.put("/:id",protect,requireSuperAdmin,upload.single("image"), updateRestaurant);
router.delete("/:id",protect,requireSuperAdmin,upload.single("image"), deleteRestaurant);

// Add products
router.post("/:restaurantId/menu",protect,requireSuperAdmin,upload.single("image"), addProductToMenu);
router.post("/:restaurantId/popularMenu",protect,requireSuperAdmin,upload.single("image"), addProductToPopularMenu);

export default router;
