import express from "express";
import {
  getSubscriptionById,
  cancelSubscription,
  checkoutSubscription,
  deleteSubscription,
  getAllSubscriptions,
  getSubscriptionsByUser,
  handlePaymentWebhook,
  updateSubscription,
  createSubscription,
  getSubscriptionStats,
  swapMeal,
  freezeSubscription,
  deliverMeal,
  getAllStats,
} from "../controllers/subscriptionController";

import { protect } from "../middleware/protect";
import { authorize } from "../middleware/auth";

const router = express.Router();

/**
 * ===========================
 * USER ROUTES
 * ===========================
 */

// User checkout a subscription
router.post("/:userId/checkout", protect, authorize(["User"]), checkoutSubscription);

// User cancel their subscription
router.patch("/:userId/:subscriptionId/cancel", protect, authorize(["User"]), cancelSubscription);

// User get their own subscriptions
router.get("/:userId", protect, authorize(["User"]), getSubscriptionsByUser);

// User get subscription details
router.get("/:userId/:subscriptionId", protect, authorize(["User", "SuperAdmin"]), getSubscriptionById);

// Deliver, Freeze, Swap (can be User or SuperAdmin for override/admin purposes)
router.post("/:subscriptionId/deliver", protect, authorize(["User", "SuperAdmin"]), deliverMeal);
router.post("/:subscriptionId/freeze", protect, authorize(["User", "SuperAdmin"]), freezeSubscription);
router.post("/:subscriptionId/swap", protect, authorize(["User", "SuperAdmin"]), swapMeal);

// Stats (only SuperAdmin)
router.get("/:subscriptionId/stats", protect, authorize(["SuperAdmin"]), getSubscriptionStats);
router.get("/subscription", protect, authorize(["SuperAdmin"]), getAllStats);

/**
 * ===========================
 * ADMIN / SUPERADMIN ROUTES
 * ===========================
 */

// Admin/SuperAdmin create subscription for a user
router.post("/:userId", protect, authorize([ "SuperAdmin"]), createSubscription);

// Admin/SuperAdmin update subscription
router.put("/:userId/:subscriptionId", protect, authorize(["SuperAdmin"]), updateSubscription);

// Admin/SuperAdmin delete subscription
router.delete("/:userId/:subscriptionId", protect, authorize(["SuperAdmin"]), deleteSubscription);

// Admin/SuperAdmin get all subscriptions
router.get("/", protect, authorize([ "SuperAdmin"]), getAllSubscriptions);

/**
 * ===========================
 * PAYMENT WEBHOOK
 * ===========================
 */
router.post("/webhook/payment", handlePaymentWebhook);

export default router;
