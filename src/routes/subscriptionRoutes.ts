import express from "express";
import {
  getSubscriptionById,
  cancelSubscription,
  checkoutSubscription,setSetting,updateChangeWindow,
  deleteSubscription,
  getAllSubscriptions,
  getSubscriptionsByUser,
  getSubscriptionPayments,
  handlePaymentWebhook,
  updateSubscription,
  createSubscriptionUser,
  createSubscriptionAdmin,
  stripeWebhook,
  getSubscriptionStats,
  swapMeal,
  freezeSubscription,
  deliverMeal,
  getAllStats,
  pauseSubscription,
  resumeSubscription,
  createSubscription,
  toggleSubscriptionStatus,
  processRefund,
  lockMealsAfterChangeWindow,
  autoRenewSubscriptions,
  upsertSetting,
  getSettings,
  deleteSetting,
  createSubscriptionWithMealSelection,
  paySubscriptionAmount
} from "../controllers/subscriptionController";

import { protect } from "../middleware/protect";
import { authorize } from "../middleware/auth";

const router = express.Router();

/**
 * ===========================
 * STATIC ROUTES (Put these first)
 * ===========================
 */

// Webhook routes (should be before any dynamic routes)
router.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

router.post("/webhook/payment", handlePaymentWebhook);
router.post('/update-change-window',updateChangeWindow);

// Static admin routes
router.get("/subscription/stats", protect, authorize(["superadmin"]), getAllStats);
router.post('/subscriptions/payments', protect, authorize(["superadmin"]), getSubscriptionPayments);

// Settings routes
router.post("/settings", protect, authorize(["superadmin"]), upsertSetting);
router.get("/settings", protect, authorize(["superadmin"]), getSettings);
router.delete("/settings/:key", protect, authorize(["superadmin"]), deleteSetting);

// System routes
router.post("/create", createSubscription);
router.post("/refund", protect, authorize(["superadmin"]), processRefund);

// Cron/utility endpoints
router.post("/lock-meals", protect, authorize(["superadmin"]), async (req, res) => {
  try {
    await lockMealsAfterChangeWindow();
    res.json({ message: "Meals locked successfully" });
  } catch (err: any) {
    res.status(500).json({ message: "Error locking meals", error: err.message });
  }
});

router.post("/auto-renew", protect, authorize(["superadmin"]), async (req, res) => {
  try {
    await autoRenewSubscriptions();
    res.json({ message: "Auto-renew executed successfully" });
  } catch (err: any) {
    res.status(500).json({ message: "Error in auto-renew", error: err.message });
  }
});

/**
 * ===========================
 * SUBSCRIPTION ID ROUTES
 * ===========================
 */

// Subscription-specific operations
router.get("/id/:subscriptionId", protect, authorize(["user", "superadmin"]), getSubscriptionById);
router.patch("/id/:subscriptionId/toggle-status", toggleSubscriptionStatus);
router.post("/id/:subscriptionId/pause", protect, authorize(["user"]), pauseSubscription);
router.post("/id/:subscriptionId/resume", protect, authorize(["user"]), resumeSubscription);
router.post("/id/:subscriptionId/paid", protect, authorize(["user"]), paySubscriptionAmount);

// Meal operations
router.post("/id/:subscriptionId/deliver", protect, authorize(["user", "superadmin"]), deliverMeal);
router.post("/id/:subscriptionId/freeze", protect, authorize(["user", "superadmin"]), freezeSubscription);
router.post("/id/:subscriptionId/swap", protect, authorize(["user", "superadmin"]), swapMeal);

// Stats for specific subscription
router.get("/id/:subscriptionId/stats", protect, authorize(["superadmin"]), getSubscriptionStats);

/**
 * ===========================
 * USER-SPECIFIC ROUTES
 * ===========================
 */

// User checkout
router.post("/user/:userId/checkout", protect, authorize(["user"]), createSubscriptionWithMealSelection);

// User get their subscriptions
router.get("/user/:userId", protect, authorize(["user"]), getSubscriptionsByUser);

// User cancel specific subscription
router.patch("/user/:userId/cancel/:subscriptionId", protect, authorize(["user"]), cancelSubscription);

// Admin operations on user subscriptions
router.post("/user/:userId", protect, authorize(["superadmin"]), createSubscriptionAdmin);
router.put("/user/:userId/:subscriptionId", protect, authorize(["superadmin"]), updateSubscription);
router.delete("/user/:userId/:subscriptionId", protect, authorize(["superadmin"]), deleteSubscription);

/**
 * ===========================
 * GENERAL ROUTES
 * ===========================
 */
router.post('/subscriptionss/payments',protect,authorize(["superadmin"]),getSubscriptionPayments)
// Get all subscriptions (admin only)
router.get("/", protect, authorize(["superadmin"]), getAllSubscriptions);

export default router;