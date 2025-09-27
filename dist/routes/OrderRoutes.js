"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const OrderController_1 = require("../controllers/OrderController");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ------------------ USER ROUTES ------------------
// Checkout an order
router.post("/checkout/:userId", protect_1.protect, (0, auth_1.authorize)(["User"]), OrderController_1.checkout);
// Get orders for a specific user
router.get("/orders/user/:userId", protect_1.protect, (0, auth_1.authorize)(["User"]), OrderController_1.getOrdersByUser);
// Delete an order by the user
router.delete("/order/:id", protect_1.protect, (0, auth_1.authorize)(["User"]), OrderController_1.deleteOrderById);
// ------------------ PUBLIC ROUTES ------------------
// Get order by ID
router.get("/orders/:orderId", OrderController_1.getOrderById);
// Get orders by product
router.get("/orders/product/:productId", OrderController_1.getOrdersByProduct);
// ------------------ SUPERADMIN ROUTES ------------------
// Get all orders
router.get("/orders", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), OrderController_1.getAllOrders);
// Toggle order status
router.put("/order/:id/status/update", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), OrderController_1.toggleOrderStatus);
// Get all order statistics
router.get("/orders/stats/all", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), OrderController_1.getOrderStats);
exports.default = router;
