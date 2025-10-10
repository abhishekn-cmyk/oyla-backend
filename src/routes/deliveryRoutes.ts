// routes/apiRoutes.ts
import express from "express";
import bodyParser from "body-parser";
import {
//   createSubscription,
  stripeWebhook,
  getUserSubscriptions,
  getAllSubscriptions,
  updateDailyOrder,
  adminUpdateDailyOrder,
  getDailyOrders,
  createProduct,
  getProducts,
  updateProduct,
  createDeliveryPartner,
  getDeliveryPartners,
  updateDeliveryPartnerStatus,
  assignDelivery,
  updateDeliveryStatus,
  toggleSubscriptionStatus,
  getRevenueReport,
  getDeliveryDelayReport,
  processRefund,
  createSubscription,
} from "../controllers/deliveryPartnerController"; // adjust import path
import { protect } from "../middleware/protect";
import { authorize } from "../middleware/auth";

const router = express.Router();

/* ------------------- SUBSCRIPTION ------------------- */
/* ------------------- SUBSCRIPTION ------------------- */
// User creates subscription & Stripe payment
router.post("/subscriptions", protect, createSubscription);

// Stripe webhook
router.post("/subscriptions/stripe-webhook",  bodyParser.raw({ type: "application/json" }),
 stripeWebhook);

// Get subscriptions for logged-in user
router.get("/subscriptions/me", protect, getUserSubscriptions);

// Get subscriptions for a specific user by ID (admin/superadmin)
router.get("/subscriptions/user/:id", protect, authorize(["admin", "superadmin"]), getUserSubscriptions);

// Get all subscriptions (admin/superadmin)
router.get("/subscriptions", protect, authorize(["admin", "superadmin"]), getAllSubscriptions);

// Pause / Resume subscription
router.put("/subscriptions/:subscriptionId/toggle", protect, authorize(["admin", "superadmin"]), toggleSubscriptionStatus);

/* ------------------- DAILY ORDERS ------------------- */
// User updates order (within change window)
router.put("/orders/:orderId", protect, updateDailyOrder);

// Admin updates any order
router.put("/admin/orders/:orderId", protect, authorize(["admin", "superadmin"]), adminUpdateDailyOrder);

// Get daily orders for logged-in user
router.get("/orders/me", protect, getDailyOrders);

// Get daily orders for a specific user by ID (admin/superadmin)
router.get("/orders/user/:id", protect, authorize(["admin", "superadmin"]), getDailyOrders);

/* ------------------- PRODUCTS / MEALS ------------------- */
// CRUD for products
router.post("/products", protect, authorize(["superadmin"]), createProduct);
router.get("/products", getProducts);
router.put("/products/:productId", protect, authorize(["superadmin"]), updateProduct);

/* ------------------- DELIVERY PARTNERS ------------------- */
router.post("/delivery-partners", protect, authorize(["superadmin"]), createDeliveryPartner);
router.get("/delivery-partners", protect, authorize(["admin", "superadmin"]), getDeliveryPartners);
router.put("/delivery-partners/:partnerId/status", protect, authorize(["superadmin"]), updateDeliveryPartnerStatus);

/* ------------------- DELIVERIES ------------------- */
router.post("/deliveries/assign", protect, authorize(["admin", "superadmin"]), assignDelivery);
router.put("/deliveries/:deliveryId/status", protect, authorize(["admin", "superadmin"]), updateDeliveryStatus);

/* ------------------- REPORTS ------------------- */
router.get("/reports/revenue", protect, authorize(["admin", "superadmin"]), getRevenueReport);
router.get("/reports/delivery-delays", protect, authorize(["admin", "superadmin"]), getDeliveryDelayReport);

/* ------------------- REFUNDS / ISSUE RESOLUTION ------------------- */
router.post("/subscriptions/refund", protect, authorize(["admin", "superadmin"]), processRefund);

export default router;
