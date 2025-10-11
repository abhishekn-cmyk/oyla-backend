"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/apiRoutes.ts
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const deliveryPartnerController_1 = require("../controllers/deliveryPartnerController"); // adjust import path
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/* ------------------- SUBSCRIPTION ------------------- */
/* ------------------- SUBSCRIPTION ------------------- */
// User creates subscription & Stripe payment
router.post("/subscriptions", protect_1.protect, deliveryPartnerController_1.createSubscription);
// Stripe webhook
router.post("/subscriptions/stripe-webhook", body_parser_1.default.raw({ type: "application/json" }), deliveryPartnerController_1.stripeWebhook);
// Get subscriptions for logged-in user
router.get("/subscriptions/me", protect_1.protect, deliveryPartnerController_1.getUserSubscriptions);
// Get subscriptions for a specific user by ID (admin/superadmin)
router.get("/subscriptions/user/:id", protect_1.protect, (0, auth_1.authorize)(["admin", "superadmin"]), deliveryPartnerController_1.getUserSubscriptions);
// Get all subscriptions (admin/superadmin)
router.get("/subscriptions", protect_1.protect, (0, auth_1.authorize)(["admin", "superadmin"]), deliveryPartnerController_1.getAllSubscriptions);
// Pause / Resume subscription
router.put("/subscriptions/:subscriptionId/toggle", protect_1.protect, (0, auth_1.authorize)(["admin", "superadmin"]), deliveryPartnerController_1.toggleSubscriptionStatus);
/* ------------------- DAILY ORDERS ------------------- */
// User updates order (within change window)
router.put("/orders/:orderId", protect_1.protect, deliveryPartnerController_1.updateDailyOrder);
// Admin updates any order
router.put("/admin/orders/:orderId", protect_1.protect, (0, auth_1.authorize)(["admin", "superadmin"]), deliveryPartnerController_1.adminUpdateDailyOrder);
// Get daily orders for logged-in user
router.get("/orders/me", protect_1.protect, deliveryPartnerController_1.getDailyOrders);
// Get daily orders for a specific user by ID (admin/superadmin)
router.get("/orders/user/:id", protect_1.protect, (0, auth_1.authorize)(["admin", "superadmin"]), deliveryPartnerController_1.getDailyOrders);
/* ------------------- PRODUCTS / MEALS ------------------- */
// CRUD for products
router.post("/products", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), deliveryPartnerController_1.createProduct);
router.get("/products", deliveryPartnerController_1.getProducts);
router.put("/products/:productId", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), deliveryPartnerController_1.updateProduct);
/* ------------------- DELIVERY PARTNERS ------------------- */
router.post("/delivery-partners", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), deliveryPartnerController_1.createDeliveryPartner);
router.get("/delivery-partners", protect_1.protect, (0, auth_1.authorize)(["admin", "superadmin"]), deliveryPartnerController_1.getDeliveryPartners);
router.put("/delivery-partners/:partnerId/status", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), deliveryPartnerController_1.updateDeliveryPartnerStatus);
/* ------------------- DELIVERIES ------------------- */
router.post("/deliveries/assign", protect_1.protect, (0, auth_1.authorize)(["admin", "superadmin"]), deliveryPartnerController_1.assignDelivery);
router.put("/deliveries/:deliveryId/status", protect_1.protect, (0, auth_1.authorize)(["admin", "superadmin"]), deliveryPartnerController_1.updateDeliveryStatus);
/* ------------------- REPORTS ------------------- */
router.get("/reports/revenue", protect_1.protect, (0, auth_1.authorize)(["admin", "superadmin"]), deliveryPartnerController_1.getRevenueReport);
router.get("/reports/delivery-delays", protect_1.protect, (0, auth_1.authorize)(["admin", "superadmin"]), deliveryPartnerController_1.getDeliveryDelayReport);
/* ------------------- REFUNDS / ISSUE RESOLUTION ------------------- */
router.post("/subscriptions/refund", protect_1.protect, (0, auth_1.authorize)(["admin", "superadmin"]), deliveryPartnerController_1.processRefund);
exports.default = router;
