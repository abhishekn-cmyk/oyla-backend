"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const subscriptionController_1 = require("../controllers/subscriptionController");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * ===========================
 * USER ROUTES
 * ===========================
 */
// User checkout a subscription
router.post("/:userId/checkout", protect_1.protect, (0, auth_1.authorize)(["User"]), subscriptionController_1.checkoutSubscription);
// User cancel their subscription
router.patch("/:userId/:subscriptionId/cancel", protect_1.protect, (0, auth_1.authorize)(["User"]), subscriptionController_1.cancelSubscription);
// User get their own subscriptions
router.get("/:userId", protect_1.protect, (0, auth_1.authorize)(["User"]), subscriptionController_1.getSubscriptionsByUser);
// User get subscription details
router.get("/:userId/:subscriptionId", protect_1.protect, (0, auth_1.authorize)(["User", "SuperAdmin"]), subscriptionController_1.getSubscriptionById);
// Deliver, Freeze, Swap (can be User or SuperAdmin for override/admin purposes)
router.post("/:subscriptionId/deliver", protect_1.protect, (0, auth_1.authorize)(["User", "SuperAdmin"]), subscriptionController_1.deliverMeal);
router.post("/:subscriptionId/freeze", protect_1.protect, (0, auth_1.authorize)(["User", "SuperAdmin"]), subscriptionController_1.freezeSubscription);
router.post("/:subscriptionId/swap", protect_1.protect, (0, auth_1.authorize)(["User", "SuperAdmin"]), subscriptionController_1.swapMeal);
// Stats (only SuperAdmin)
router.get("/:subscriptionId/stats", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), subscriptionController_1.getSubscriptionStats);
router.get("/subscription", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), subscriptionController_1.getAllStats);
/**
 * ===========================
 * ADMIN / SUPERADMIN ROUTES
 * ===========================
 */
// Admin/SuperAdmin create subscription for a user
router.post("/:userId", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), subscriptionController_1.createSubscription);
// Admin/SuperAdmin update subscription
router.put("/:userId/:subscriptionId", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), subscriptionController_1.updateSubscription);
// Admin/SuperAdmin delete subscription
router.delete("/:userId/:subscriptionId", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), subscriptionController_1.deleteSubscription);
// Admin/SuperAdmin get all subscriptions
router.get("/", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), subscriptionController_1.getAllSubscriptions);
/**
 * ===========================
 * PAYMENT WEBHOOK
 * ===========================
 */
router.post("/webhook/payment", subscriptionController_1.handlePaymentWebhook);
exports.default = router;
