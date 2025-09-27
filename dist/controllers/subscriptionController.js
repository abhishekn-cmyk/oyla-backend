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
exports.deleteSubscription = exports.updateSubscription = exports.getSubscriptionById = exports.getSubscriptionsByUser = exports.getAllSubscriptions = exports.handlePaymentWebhook = exports.cancelSubscription = exports.createSubscription = exports.checkoutSubscription = exports.deliverMeal = exports.freezeSubscription = exports.swapMeal = exports.getAllStats = exports.getSubscriptionStats = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Subscription_1 = __importDefault(require("../models/Subscription"));
const User_1 = __importDefault(require("../models/User"));
const Wallet_1 = require("../models/Wallet");
const getSubscriptionStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { subscriptionId } = req.params;
    const sub = yield Subscription_1.default.findById(subscriptionId);
    if (!sub)
        return res.status(404).json({ message: "Subscription not found" });
    const stats = {
        totalMeals: sub.totalMeals,
        consumedMeals: sub.consumedMeals,
        deliveredMeals: sub.deliveredMeals,
        swappableMeals: sub.swappableMeals,
        frozenDays: sub.frozenDays,
        pendingDeliveries: sub.pendingDeliveries,
        remainingMeals: sub.remainingMeals,
        completedDays: sub.consumedMeals,
        pendingDays: sub.durationDays - sub.consumedMeals,
        penalty: Math.max(0, sub.price * ((sub.durationDays - sub.consumedMeals) / sub.durationDays)),
    };
    res.json({ subscription: sub, stats });
});
exports.getSubscriptionStats = getSubscriptionStats;
const getAllStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const total = yield Subscription_1.default.countDocuments();
        // Count by status
        const statusCounts = yield Subscription_1.default.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);
        // Active subscriptions overview
        const activeSubs = yield Subscription_1.default.find({ status: "active" });
        const totalMeals = activeSubs.reduce((sum, s) => sum + s.totalMeals, 0);
        const consumedMeals = activeSubs.reduce((sum, s) => sum + s.consumedMeals, 0);
        const deliveredMeals = activeSubs.reduce((sum, s) => sum + s.deliveredMeals, 0);
        const swappableMeals = activeSubs.reduce((sum, s) => sum + s.swappableMeals, 0);
        const frozenDays = activeSubs.reduce((sum, s) => sum + s.frozenDays, 0);
        res.json({
            totalSubscriptions: total,
            statusCounts,
            activeSummary: {
                totalMeals,
                consumedMeals,
                deliveredMeals,
                swappableMeals,
                frozenDays,
                pendingMeals: totalMeals - consumedMeals,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.getAllStats = getAllStats;
const swapMeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { subscriptionId } = req.params;
    const { fromMeal, toMeal } = req.body;
    const sub = yield Subscription_1.default.findById(subscriptionId);
    if (!sub)
        return res.status(404).json({ message: "Not found" });
    sub.swappableMeals++;
    sub.swapHistory.push({ date: new Date(), fromMeal, toMeal });
    yield sub.save();
    res.json({ message: "Meal swapped", subscription: sub });
});
exports.swapMeal = swapMeal;
const freezeSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { subscriptionId } = req.params;
    const { startDate, endDate, reason } = req.body;
    const sub = yield Subscription_1.default.findById(subscriptionId);
    if (!sub)
        return res.status(404).json({ message: "Subscription not found" });
    const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    sub.frozenDays += days;
    sub.freezeHistory.push({ startDate, endDate, reason });
    sub.endDate = new Date(sub.endDate.getTime() + days * 86400000);
    sub.status = "freeze";
    yield sub.save();
    res.json({ message: "Frozen", subscription: sub });
});
exports.freezeSubscription = freezeSubscription;
const deliverMeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { subscriptionId } = req.params;
    const sub = yield Subscription_1.default.findById(subscriptionId);
    if (!sub)
        return res.status(404).json({ message: "Subscription not found" });
    if (sub.remainingMeals <= 0)
        return res.status(400).json({ message: "No meals left" });
    sub.deliveredMeals++;
    sub.consumedMeals++;
    yield sub.save();
    res.json({ message: "Meal delivered", subscription: sub });
});
exports.deliverMeal = deliverMeal;
// ---------------- CREATE SUBSCRIPTION (USER CHECKOUT) ----------------
const checkoutSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { userId } = req.params;
        const { paymentMethod, price, currency, planType, planName, startDate, endDate, billingCycle, mealsPerDay, totalMeals, deliveryAddress, discountCode, discountAmount, externalPoints } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId))
            return res.status(400).json({ message: "Invalid user ID" });
        const user = yield User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        let walletHistory;
        if (paymentMethod === "wallet") {
            const wallet = yield Wallet_1.Wallet.findOne({ userId });
            if (!wallet || wallet.balance < price)
                return res.status(400).json({ message: "Insufficient wallet balance" });
            const balanceBefore = wallet.balance;
            wallet.balance -= price;
            wallet.totalSpent += price;
            yield wallet.save();
            walletHistory = yield new Wallet_1.WalletHistory({
                userId,
                walletId: wallet._id,
                type: "payment",
                amount: price,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter: wallet.balance,
                description: `Subscription payment`,
                status: "completed",
            }).save();
        }
        const subscription = new Subscription_1.default({
            userId,
            planType,
            planName,
            startDate,
            endDate,
            price,
            currency: currency || "INR",
            billingCycle,
            mealsPerDay,
            totalMeals,
            deliveryAddress,
            discountCode,
            discountAmount,
            externalPoints,
            status: paymentMethod === "wallet" ? "active" : "pending",
            payment: {
                gateway: paymentMethod === "wallet" ? "wallet" : ((_a = req.body.payment) === null || _a === void 0 ? void 0 : _a.gateway) || "razorpay",
                status: paymentMethod === "wallet" ? "completed" : "pending",
                amountPaid: price,
                currency: currency || "INR",
            },
        });
        yield subscription.save();
        res.status(201).json({
            message: "Subscription created",
            subscription,
            walletHistory: walletHistory || null,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
exports.checkoutSubscription = checkoutSubscription;
// ---------------- ADMIN CREATES SUBSCRIPTION ----------------
const createSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { paymentMethod, price, currency, planType, planName, startDate, endDate, billingCycle, mealsPerDay, totalMeals, deliveryAddress, discountCode, discountAmount, externalPoints } = req.body;
        const user = yield User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        let walletHistory;
        if (paymentMethod === "wallet") {
            const wallet = yield Wallet_1.Wallet.findOne({ userId });
            if (!wallet || wallet.balance < price)
                return res.status(400).json({ message: "Insufficient wallet balance" });
            const balanceBefore = wallet.balance;
            wallet.balance -= price;
            wallet.totalSpent += price;
            yield wallet.save();
            walletHistory = yield new Wallet_1.WalletHistory({
                userId,
                walletId: wallet._id,
                type: "payment",
                amount: price,
                currency: wallet.currency,
                balanceBefore,
                balanceAfter: wallet.balance,
                description: `Admin-created subscription payment`,
                status: "completed",
            }).save();
        }
        const subscription = new Subscription_1.default({
            userId,
            planType,
            planName,
            startDate,
            endDate,
            price,
            currency: currency || "INR",
            billingCycle,
            mealsPerDay,
            totalMeals,
            deliveryAddress,
            discountCode,
            discountAmount,
            externalPoints,
            status: paymentMethod === "wallet" ? "active" : "pending",
            payment: {
                gateway: paymentMethod === "wallet" ? "wallet" : "manual",
                status: paymentMethod === "wallet" ? "completed" : "pending",
                amountPaid: price,
                currency: currency || "INR",
            },
        });
        yield subscription.save();
        res.status(201).json({
            message: "Subscription created successfully",
            subscription,
            walletHistory: walletHistory || null,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});
exports.createSubscription = createSubscription;
// ---------------- CANCEL SUBSCRIPTION (Refund to Wallet) ----------------
const cancelSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, subscriptionId } = req.params;
        const { reason } = req.body;
        const sub = yield Subscription_1.default.findById(subscriptionId);
        if (!sub)
            return res.status(404).json({ message: "Subscription not found" });
        if (sub.userId.toString() !== userId) {
            return res.status(403).json({ message: "You cannot cancel someone else's subscription" });
        }
        const now = new Date();
        // Calculate days
        const totalDays = sub.durationDays ||
            Math.ceil((sub.endDate.getTime() - sub.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const completedDays = Math.min(totalDays, Math.ceil((now.getTime() - sub.startDate.getTime()) / (1000 * 60 * 60 * 24)));
        const pendingDays = totalDays - completedDays;
        // Calculate penalty = pendingDays × per-day price
        const perDayPrice = sub.price / totalDays;
        const penalty = perDayPrice * pendingDays;
        // Refund = total paid - penalty
        let refund = sub.price - penalty;
        refund = refund > 0 ? refund : 0;
        // Update subscription
        sub.status = "cancelled";
        sub.cancellationDate = now;
        sub.cancellationReason = reason || "User requested";
        sub.cancellationStatus = "pending";
        sub.completedDays = completedDays;
        sub.pendingDays = pendingDays;
        sub.penaltyAmount = penalty;
        sub.refundAmount = refund;
        // Wallet refund (only refund, not penalty)
        if (refund > 0) {
            const wallet = yield Wallet_1.Wallet.findOne({ userId: sub.userId });
            if (wallet) {
                const balanceBefore = wallet.balance;
                wallet.balance += refund;
                yield wallet.save();
                yield new Wallet_1.WalletHistory({
                    userId: sub.userId,
                    walletId: wallet._id,
                    type: "refund",
                    amount: refund,
                    currency: wallet.currency,
                    balanceBefore,
                    balanceAfter: wallet.balance,
                    description: `Refund after ${penalty} KWD penalty for subscription cancellation`,
                    status: "completed",
                }).save();
            }
        }
        if (sub.payment)
            sub.payment.status = "refunded";
        yield sub.save();
        res.status(200).json({
            message: "Subscription cancelled with penalty applied",
            subscription: sub,
            breakdown: {
                totalDays,
                completedDays,
                pendingDays,
                perDayPrice,
                penalty,
                refund,
            },
        });
    }
    catch (err) {
        console.error("Error cancelling subscription:", err);
        res.status(500).json({ error: err.message });
    }
});
exports.cancelSubscription = cancelSubscription;
// ---------------- PAYMENT WEBHOOK ----------------
const handlePaymentWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subscriptionId, transactionId, amount, status } = req.body;
        const subscription = yield Subscription_1.default.findById(subscriptionId);
        if (!subscription)
            return res.status(404).json({ message: "Subscription not found" });
        subscription.payment.status = status;
        subscription.payment.transactionId = transactionId;
        subscription.payment.paymentDate = new Date();
        subscription.payment.amountPaid = amount;
        yield subscription.save();
        res.status(200).json({ message: "Payment updated", subscription });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.handlePaymentWebhook = handlePaymentWebhook;
// ---------------- GET ALL SUBSCRIPTIONS (SuperAdmin) ----------------
const getAllSubscriptions = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subs = yield Subscription_1.default.find()
            .populate("userId", "firstName lastName email")
            .sort({ createdAt: -1 });
        res.status(200).json(subs);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.getAllSubscriptions = getAllSubscriptions;
// ---------------- GET USER SUBSCRIPTIONS ----------------
const getSubscriptionsByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId))
            return res.status(400).json({ message: "Invalid user ID" });
        const subs = yield Subscription_1.default.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(subs);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.getSubscriptionsByUser = getSubscriptionsByUser;
// ---------------- GET SUBSCRIPTION BY ID ----------------
const getSubscriptionById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const sub = yield Subscription_1.default.findById(id).populate("userId", "firstName lastName email");
        if (!sub)
            return res.status(404).json({ message: "Not found" });
        res.status(200).json(sub);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.getSubscriptionById = getSubscriptionById;
// ---------------- UPDATE SUBSCRIPTION ----------------
const updateSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subscriptionId } = req.params; // get from body
        if (!subscriptionId)
            return res.status(400).json({ message: "subscriptionId is required" });
        const sub = yield Subscription_1.default.findByIdAndUpdate(subscriptionId, req.body, { new: true, runValidators: true });
        if (!sub)
            return res.status(404).json({ message: "Subscription not found" });
        res.status(200).json(sub);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.updateSubscription = updateSubscription;
// ---------------- DELETE SUBSCRIPTION ----------------
const deleteSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const sub = yield Subscription_1.default.findByIdAndDelete(id);
        if (!sub)
            return res.status(404).json({ message: "Not found" });
        res.status(200).json({ message: "Deleted" });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.deleteSubscription = deleteSubscription;
