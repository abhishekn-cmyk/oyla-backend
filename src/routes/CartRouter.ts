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
router.get("/:userId", protect, authorize(["user"]), getCartByUser);

// Add item to cart
router.post("/:productId/:userId/add", protect, authorize(["user"]), addToCart);

// Update item in cart
router.put("/:productId/:userId/update", protect, authorize(["user"]), updateCartItem);

// Delete item from cart
router.delete("/:productId/:userId/delete", protect, authorize(["user"]), deleteCartItem);

// ------------------ Admin / SuperAdmin Routes ------------------
// Get full cart details (SuperAdmin only)
router.get("/full/cart-details", protect, authorize(["superadmin"]), getFullCart);

export default router;
