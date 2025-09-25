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
  getAllStats, // ✅ new
} from "../controllers/subscriptionController";

import { protect } from "../middleware/protect";
import { requireSuperAdmin, requireUser } from "../middleware/auth";

const router = express.Router();

/**
 * ===========================
 * USER ROUTES
 * ===========================
 */

// User checkout a subscription
router.post("/:userId/checkout", protect, requireUser, checkoutSubscription);

// User cancel their subscription
router.patch("/:userId/:subscriptionId/cancel", protect, requireUser, cancelSubscription);

// User get their own subscriptions
router.get("/:userId", protect, requireUser, getSubscriptionsByUser);

// User get subscription details
router.get("/:userId/:subscriptionId", protect, requireUser, getSubscriptionById);


router.post("/:subscriptionId/deliver", protect, requireUser, deliverMeal);
router.post("/:subscriptionId/freeze", protect, requireUser, freezeSubscription);
router.post("/:subscriptionId/swap", protect, requireUser, swapMeal);

// Stats
router.get("/:subscriptionId/stats", protect, requireSuperAdmin, getSubscriptionStats);
router.get('/subscription',protect,requireSuperAdmin,getAllStats);
/**
 * ===========================
 * ADMIN / SUPERADMIN ROUTES
 * ===========================
 */

// Admin/SuperAdmin create subscription for a user
router.post("/:userId", protect, requireSuperAdmin, createSubscription);

// Admin/SuperAdmin update subscription
router.put("/:userId/:subscriptionId", protect, requireSuperAdmin, updateSubscription);

// Admin/SuperAdmin delete subscription
router.delete("/:userId/:subscriptionId", protect, requireSuperAdmin, deleteSubscription);

// Admin/SuperAdmin get all subscriptions
router.get("/", protect, requireSuperAdmin, getAllSubscriptions);


/**
 * ===========================
 * PAYMENT WEBHOOK
 * ===========================
 */
router.post("/webhook/payment", handlePaymentWebhook);

export default router;
