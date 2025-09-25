import express from "express";
import {
  getAllOrders,
  checkout,
  getOrderById,
  getOrdersByUser,
  getOrdersByProduct,
  deleteOrderById,
  toggleOrderStatus,
} from "../controllers/OrderController";
import { protect } from "../middleware/protect";
import { authorize } from "../middleware/auth";

const router = express.Router();

// ------------------ USER ROUTES ------------------
// Checkout an order
router.post("/checkout/:userId", protect, authorize(["User"]), checkout);

// Get orders for a specific user
router.get("/orders/user/:userId", protect, authorize(["User"]), getOrdersByUser);

// Delete an order by the user
router.delete("/order/:id", protect, authorize(["User"]), deleteOrderById);

// ------------------ PUBLIC ROUTES ------------------
// Get order by ID (public)
router.get("/orders/:orderId", getOrderById);

// Get orders by product (public)
router.get("/orders/product/:productId", getOrdersByProduct);

// ------------------ SUPERADMIN ROUTES ------------------
// Get all orders
router.get("/orders", protect, authorize(["SuperAdmin"]), getAllOrders);

// Toggle order status
router.put("/order/:id/status", protect, authorize(["SuperAdmin"]), toggleOrderStatus);

export default router;
