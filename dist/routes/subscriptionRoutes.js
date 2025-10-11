"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
 * STATIC ROUTES (Put these first)
 * ===========================
 */
// Webhook routes (should be before any dynamic routes)
router.post("/stripe/webhook", express_1.default.raw({ type: "application/json" }), subscriptionController_1.stripeWebhook);
router.post("/webhook/payment", subscriptionController_1.handlePaymentWebhook);
router.post('/update-change-window', subscriptionController_1.updateChangeWindow);
// Static admin routes
router.get("/subscription/stats", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), subscriptionController_1.getAllStats);
router.post('/subscriptions/payments', protect_1.protect, (0, auth_1.authorize)(["superadmin"]), subscriptionController_1.getSubscriptionPayments);
// Settings routes
router.post("/settings", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), subscriptionController_1.upsertSetting);
router.get("/settings", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), subscriptionController_1.getSettings);
router.delete("/settings/:key", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), subscriptionController_1.deleteSetting);
// System routes
router.post("/create", subscriptionController_1.createSubscription);
router.post("/refund", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), subscriptionController_1.processRefund);
// Cron/utility endpoints
router.post("/lock-meals", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, subscriptionController_1.lockMealsAfterChangeWindow)();
        res.json({ message: "Meals locked successfully" });
    }
    catch (err) {
        res.status(500).json({ message: "Error locking meals", error: err.message });
    }
}));
router.post("/auto-renew", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, subscriptionController_1.autoRenewSubscriptions)();
        res.json({ message: "Auto-renew executed successfully" });
    }
    catch (err) {
        res.status(500).json({ message: "Error in auto-renew", error: err.message });
    }
}));
/**
 * ===========================
 * SUBSCRIPTION ID ROUTES
 * ===========================
 */
// Subscription-specific operations
router.get("/id/:subscriptionId", protect_1.protect, (0, auth_1.authorize)(["user", "superadmin"]), subscriptionController_1.getSubscriptionById);
router.patch("/id/:subscriptionId/toggle-status", subscriptionController_1.toggleSubscriptionStatus);
router.post("/id/:subscriptionId/pause", protect_1.protect, (0, auth_1.authorize)(["user"]), subscriptionController_1.pauseSubscription);
router.post("/id/:subscriptionId/resume", protect_1.protect, (0, auth_1.authorize)(["user"]), subscriptionController_1.resumeSubscription);
router.post("/id/:subscriptionId/paid", protect_1.protect, (0, auth_1.authorize)(["user"]), subscriptionController_1.paySubscriptionAmount);
// Meal operations
router.post("/id/:subscriptionId/deliver", protect_1.protect, (0, auth_1.authorize)(["user", "superadmin"]), subscriptionController_1.deliverMeal);
router.post("/id/:subscriptionId/freeze", protect_1.protect, (0, auth_1.authorize)(["user", "superadmin"]), subscriptionController_1.freezeSubscription);
router.post("/id/:subscriptionId/swap", protect_1.protect, (0, auth_1.authorize)(["user", "superadmin"]), subscriptionController_1.swapMeal);
// Stats for specific subscription
router.get("/id/:subscriptionId/stats", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), subscriptionController_1.getSubscriptionStats);
/**
 * ===========================
 * USER-SPECIFIC ROUTES
 * ===========================
 */
// User checkout
router.post("/user/:userId/checkout", protect_1.protect, (0, auth_1.authorize)(["user"]), subscriptionController_1.createSubscriptionWithMealSelection);
// User get their subscriptions
router.get("/user/:userId", protect_1.protect, (0, auth_1.authorize)(["user"]), subscriptionController_1.getSubscriptionsByUser);
// User cancel specific subscription
router.patch("/user/:userId/cancel/:subscriptionId", protect_1.protect, (0, auth_1.authorize)(["user"]), subscriptionController_1.cancelSubscription);
// Admin operations on user subscriptions
router.post("/user/:userId", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), subscriptionController_1.createSubscriptionAdmin);
router.put("/user/:userId/:subscriptionId", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), subscriptionController_1.updateSubscription);
router.delete("/user/:userId/:subscriptionId", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), subscriptionController_1.deleteSubscription);
/**
 * ===========================
 * GENERAL ROUTES
 * ===========================
 */
router.post('/subscriptionss/payments', protect_1.protect, (0, auth_1.authorize)(["superadmin"]), subscriptionController_1.getSubscriptionPayments);
// Get all subscriptions (admin only)
router.get("/", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), subscriptionController_1.getAllSubscriptions);
exports.default = router;
