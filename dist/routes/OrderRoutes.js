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
const OrderController_1 = require("../controllers/OrderController");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.patch("/order/:orderId/status", OrderController_1.updateOrderStatus);
router.patch("/order/:orderId/payment", OrderController_1.updatePaymentStatus);
// ------------------ USER ROUTES ------------------
// Checkout an order
router.post("/checkout/:userId", protect_1.protect, (0, auth_1.authorize)(["user"]), OrderController_1.checkout);
// Get orders for a specific user
router.get("/orders/user/:userId", protect_1.protect, (0, auth_1.authorize)(["user"]), OrderController_1.getDailyOrdersByUser);
// Delete an order by the user
router.delete("/order/:id", protect_1.protect, (0, auth_1.authorize)(["user"]), OrderController_1.deleteDailyOrderById);
// ------------------ PUBLIC ROUTES ------------------
// Get order by ID
router.get("/orders/:orderId", OrderController_1.getDailyOrderById);
// Get orders by product
// router.get("/orders/product/:productId", getOrd);
// ------------------ SUPERADMIN ROUTES ------------------
// Get all orders
router.get("/orders", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), OrderController_1.getAllDailyOrders);
// Toggle order status
router.put("/order/:id/status/update", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), OrderController_1.toggleDailyOrderStatus);
// Get all order statistics
router.get("/orders/stats/all", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), OrderController_1.getDailyOrderStats);
const systemController_1 = require("../controllers/systemController");
// ----------------- SUBSCRIPTION ROUTES -----------------
router.get('/', (req, res) => res.send('System route works'));
// Create a subscription (logged-in users)
router.post("/create", systemController_1.createSubscription);
// Pause / Resume subscription (logged-in users)
router.patch("/:subscriptionId/toggle-status", systemController_1.toggleSubscriptionStatus);
// Refund subscription (admin only)
router.post("/refund", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), systemController_1.processRefund);
// ----------------- SYSTEM SETTINGS (SUPERADMIN ONLY) -----------------
router.post("/settings", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), systemController_1.upsertSetting);
router.get("/settings", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), systemController_1.getSettings);
router.delete("/settings/:key", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), systemController_1.deleteSetting);
// ----------------- CRON / UTILITY ENDPOINTS -----------------
// Lock meals after change window (internal / cron)
router.post("/lock-meals", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, systemController_1.lockMealsAfterChangeWindow)();
        res.json({ message: "Meals locked successfully" });
    }
    catch (err) {
        res.status(500).json({ message: "Error locking meals", error: err.message });
    }
}));
// Auto-renew subscriptions (internal / cron)
router.post("/auto-renew", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, systemController_1.autoRenewSubscriptions)();
        res.json({ message: "Auto-renew executed successfully" });
    }
    catch (err) {
        res.status(500).json({ message: "Error in auto-renew", error: err.message });
    }
}));
exports.default = router;
