import express from "express";
import {
  addToCart,
  deleteCartItem,
  getCartByUser,
  getFullCart,
  updateCartItem,
} from "../controllers/CartController";

import { protect } from "../middleware/protect";
import { authorize } from "../middleware/auth";

const router = express.Router();

// ------------------ User Routes ------------------
// Get user's cart
router.get("/:userId", protect, authorize(["User"]), getCartByUser);

// Add item to cart
router.post("/:productId/:userId/add", protect, authorize(["User"]), addToCart);

// Update item in cart
router.put("/:productId/:userId/update", protect, authorize(["User"]), updateCartItem);

// Delete item from cart
router.delete("/:productId/:userId/delete", protect, authorize(["User"]), deleteCartItem);

// ------------------ Admin / SuperAdmin Routes ------------------
// Get full cart details (SuperAdmin only)
router.get("/full/cart-details", protect, authorize(["SuperAdmin"]), getFullCart);

export default router;
