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
exports.getOrderStats = exports.toggleOrderStatus = exports.deleteOrderById = exports.getOrdersByProduct = exports.getOrderById = exports.getOrdersByUser = exports.getAllOrders = exports.checkout = void 0;
const Cart_1 = __importDefault(require("../models/Cart"));
const Order_1 = __importDefault(require("../models/Order"));
const User_1 = __importDefault(require("../models/User"));
const Restaurant_1 = __importDefault(require("../models/Restaurant"));
const Program_1 = __importDefault(require("../models/Program"));
const Wallet_1 = require("../models/Wallet");
const checkout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { paymentMethod, shippingAddress } = req.body;
        const user = yield User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const cart = yield Cart_1.default.findOne({ userId }).populate("items.product");
        if (!cart || cart.items.length === 0)
            return res.status(400).json({ message: "Cart is empty" });
        // Build order items with restaurant & program info
        const orderItems = yield Promise.all(cart.items.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            const product = item.product;
            const restaurant = yield Restaurant_1.default.findOne({
                $or: [{ "menu._id": product._id }, { "popularMenu._id": product._id }],
            }).select("_id");
            const program = yield Program_1.default.findOne({
                "product._id": product._id,
            }).select("_id");
            return {
                product: product._id,
                quantity: item.quantity,
                price: product.price,
                restaurant: restaurant === null || restaurant === void 0 ? void 0 : restaurant._id,
                program: program === null || program === void 0 ? void 0 : program._id,
            };
        })));
        const totalPrice = cart.totalPrice;
        // Handle wallet payment
        if (paymentMethod === "wallet") {
            const wallet = yield Wallet_1.Wallet.findOne({ userId });
            if (!wallet || wallet.balance < totalPrice) {
                return res.status(400).json({ message: "Insufficient wallet balance" });
            }
            const balanceBefore = wallet.balance;
            wallet.balance -= totalPrice;
            wallet.totalSpent += totalPrice;
            yield wallet.save();
            // Wallet History entry
            const walletHistory = new Wallet_1.WalletHistory({
                userId,
                walletId: wallet._id,
                type: "payment",
                amount: totalPrice,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter: wallet.balance,
                description: `Payment for order`,
                status: "completed",
            });
            yield walletHistory.save();
        }
        // Create order
        const order = new Order_1.default({
            userId,
            items: orderItems,
            totalPrice,
            status: paymentMethod === "wallet" ? "completed" : "pending",
            paymentMethod,
            shippingAddress,
        });
        yield order.save();
        // Clear cart
        cart.items = [];
        cart.totalPrice = 0;
        yield cart.save();
        res.status(201).json(order);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || err });
    }
});
exports.checkout = checkout;
const getAllOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield Order_1.default.find()
            .populate("userId", "-password")
            .populate("items.product")
            .populate({
            path: "items.restaurant",
            populate: { path: "products" },
        })
            .populate({
            path: "items.program",
            populate: { path: "products" },
        });
        res.status(200).json(orders);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.getAllOrders = getAllOrders;
const getOrdersByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const orders = yield Order_1.default.find({ userId })
            .populate("userId", "-password")
            .populate("items.product")
            .populate({
            path: "items.restaurant",
            populate: { path: "products" },
        })
            .populate({
            path: "items.program",
            populate: { path: "products" },
        });
        res.status(200).json(orders);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.getOrdersByUser = getOrdersByUser;
const getOrderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        const order = yield Order_1.default.findById(orderId)
            .populate("userId", "-password")
            .populate("items.product")
            .populate({
            path: "items.restaurant",
            populate: { path: "products" },
        })
            .populate({
            path: "items.program",
            populate: { path: "products" },
        });
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        res.status(200).json(order);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.getOrderById = getOrderById;
const getOrdersByProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const orders = yield Order_1.default.find({ "items.product": productId })
            .populate("userId", "-password")
            .populate("items.product")
            .populate({
            path: "items.restaurant",
            populate: { path: "products" },
        })
            .populate({
            path: "items.program",
            populate: { path: "products" },
        });
        res.status(200).json(orders);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.getOrdersByProduct = getOrdersByProduct;
const deleteOrderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: orderId } = req.params;
        const order = yield Order_1.default.findById(orderId);
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        // Use deleteOne on the document
        yield Order_1.default.deleteOne({ _id: order._id });
        res.status(200).json({ message: "Order deleted successfully" });
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.deleteOrderById = deleteOrderById;
const toggleOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // <- match route param name
        const order = yield Order_1.default.findById(id);
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        // Example toggle logic using allowed statuses
        switch (order.status) {
            case "paid":
                order.status = "shipped";
                break;
            case "shipped":
                order.status = "delivered";
                break;
            case "delivered":
                order.status = "paid"; // cycle back if you want
                break;
            case "cancelled":
                order.status = "paid"; // optional
                break;
            default:
                order.status = "paid"; // fallback
        }
        yield order.save();
        res.status(200).json({ message: "Order status updated", status: order.status });
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.toggleOrderStatus = toggleOrderStatus;
// Get order statistics
const getOrderStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Total orders count
        const totalOrders = yield Order_1.default.countDocuments();
        // Count of orders by status
        const pendingOrders = yield Order_1.default.countDocuments({ status: "pending" });
        const completedOrders = yield Order_1.default.countDocuments({ status: "delivered" });
        // Aggregate total revenue
        const revenueResult = yield Order_1.default.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalPrice" },
                    pendingRevenue: {
                        $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$totalPrice", 0] },
                    },
                    completedRevenue: {
                        $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$totalPrice", 0] },
                    },
                },
            },
        ]);
        const totals = revenueResult[0] || { totalRevenue: 0, pendingRevenue: 0, completedRevenue: 0 };
        res.status(200).json({
            totalOrders,
            pendingOrders,
            completedOrders,
            totalRevenue: totals.totalRevenue,
            pendingRevenue: totals.pendingRevenue,
            completedRevenue: totals.completedRevenue,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching order stats", error });
    }
});
exports.getOrderStats = getOrderStats;
