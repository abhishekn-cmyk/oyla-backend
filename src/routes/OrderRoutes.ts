import express from "express";
import {
  getAllDailyOrders,
  checkout,
  getDailyOrderById,
  getDailyOrderStats,
  getDailyOrdersByUser,
updateOrderStatus,createDailyOrderNotification,updatePaymentStatus,
  toggleDailyOrderStatus,
  deleteDailyOrderById,
  
} from "../controllers/OrderController";
import { protect } from "../middleware/protect";
import { authorize } from "../middleware/auth";

const router = express.Router();
router.patch("/order/:orderId/status", updateOrderStatus);
router.patch("/order/:orderId/payment", updatePaymentStatus);

// ------------------ USER ROUTES ------------------
// Checkout an order
router.post("/checkout/:userId", protect, authorize(["user"]), checkout);

// Get orders for a specific user
router.get("/orders/user/:userId", protect, authorize(["user"]), getDailyOrdersByUser);

// Delete an order by the user
router.delete("/order/:id", protect, authorize(["user"]), deleteDailyOrderById);

// ------------------ PUBLIC ROUTES ------------------
// Get order by ID
router.get("/orders/:orderId", getDailyOrderById);

// Get orders by product
// router.get("/orders/product/:productId", getOrd);

// ------------------ SUPERADMIN ROUTES ------------------
// Get all orders
router.get("/orders", protect, authorize(["superadmin"]), getAllDailyOrders);

// Toggle order status
router.put("/order/:id/status/update", protect, authorize(["superadmin"]), toggleDailyOrderStatus);

// Get all order statistics
router.get("/orders/stats/all", protect, authorize(["superadmin"]), getDailyOrderStats);

import {
  createSubscription,
  toggleSubscriptionStatus,
  processRefund,
  lockMealsAfterChangeWindow,
  autoRenewSubscriptions,
  upsertSetting,
  getSettings,
  deleteSetting,
} from "../controllers/systemController";



// ----------------- SUBSCRIPTION ROUTES -----------------
router.get('/', (req, res) => res.send('System route works'));
// Create a subscription (logged-in users)
router.post("/create", createSubscription);

// Pause / Resume subscription (logged-in users)
router.patch("/:subscriptionId/toggle-status",  toggleSubscriptionStatus);

// Refund subscription (admin only)
router.post("/refund", protect, authorize(["superadmin"]), processRefund);

// ----------------- SYSTEM SETTINGS (SUPERADMIN ONLY) -----------------
router.post("/settings", protect,authorize(["superadmin"]), upsertSetting);
router.get("/settings", protect,authorize(["superadmin"]), getSettings);
router.delete("/settings/:key", protect, authorize(["superadmin"]), deleteSetting);

// ----------------- CRON / UTILITY ENDPOINTS -----------------

// Lock meals after change window (internal / cron)
router.post("/lock-meals", protect, authorize(["superadmin"]), async (req, res) => {
  try {
    await lockMealsAfterChangeWindow();
    res.json({ message: "Meals locked successfully" });
  } catch (err: any) {
    res.status(500).json({ message: "Error locking meals", error: err.message });
  }
});

// Auto-renew subscriptions (internal / cron)
router.post("/auto-renew", protect, authorize(["superadmin"]), async (req, res) => {
  try {
    await autoRenewSubscriptions();
    res.json({ message: "Auto-renew executed successfully" });
  } catch (err: any) {
    res.status(500).json({ message: "Error in auto-renew", error: err.message });
  }
});


export default router;
