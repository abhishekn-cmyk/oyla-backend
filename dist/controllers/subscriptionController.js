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
exports.paySubscriptionAmount = exports.createSubscriptionWithMealSelection = exports.deleteSetting = exports.getSettings = exports.upsertSetting = exports.autoRenewSubscriptions = exports.lockMealsAfterChangeWindow = exports.processRefund = exports.toggleSubscriptionStatus = exports.createSubscription = exports.handlePaymentWebhook = exports.createSubscriptionAdmin = exports.getAllStats = exports.getSubscriptionStats = exports.deleteSubscription = exports.updateSubscription = exports.getSubscriptionsByUser = exports.getAllSubscriptions = exports.getSubscriptionPayments = exports.getSubscriptionById = exports.swapMeal = exports.deliverMeal = exports.freezeSubscription = exports.cancelSubscription = exports.resumeSubscription = exports.pauseSubscription = exports.stripeWebhook = exports.createSubscriptionUser = exports.checkoutSubscription = exports.updateChangeWindow = exports.setSetting = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
const stripe_1 = __importDefault(require("stripe"));
const Payment_1 = __importDefault(require("../models/Payment"));
const Payment_2 = __importDefault(require("../models/Payment"));
const Subscription_1 = __importDefault(require("../models/Subscription"));
const User_1 = __importDefault(require("../models/User"));
const Product_1 = __importDefault(require("../models/Product"));
const SystemSettings_1 = __importDefault(require("../models/SystemSettings"));
const DailyOrder_1 = require("../models/DailyOrder");
const Wallet_1 = require("../models/Wallet");
// controllers/subscriptionController.ts
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const mealCache = new node_cache_1.default({ stdTTL: 3600 });
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
const createNotification_1 = require("./createNotification");
const server_1 = require("../server");
const setSetting = (key, value) => __awaiter(void 0, void 0, void 0, function* () {
    yield SystemSettings_1.default.updateOne({ key }, { value }, { upsert: true });
});
exports.setSetting = setSetting;
const updateChangeWindow = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { days } = req.body; // e.g., { days: 5 }
        if (typeof days !== "number" || days <= 0) {
            return res.status(400).json({ message: "Invalid days value" });
        }
        yield (0, exports.setSetting)("subscription.changeWindowDays", days);
        return res.json({ message: `Change window updated to ${days} days` });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to update change window" });
    }
});
exports.updateChangeWindow = updateChangeWindow;
// -------------------- USER CHECKOUT --------------------
const checkoutSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, exports.createSubscriptionUser)(req, res);
});
exports.checkoutSubscription = checkoutSubscription;
// -------------------- CREATE SUBSCRIPTION (USER + WALLET + STRIPE) --------------------
const createSubscriptionUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.params.userId;
        const { durationDays, mealsPerDay, startDate, planType, mealSelections = [], autoRenew = false, paymentMethod, } = req.body;
        const user = yield User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
        // ---------------- PRICE CALCULATION ----------------
        const basePrice = ((_a = (yield SystemSettings_1.default.findOne({ key: "price_per_meal" }))) === null || _a === void 0 ? void 0 : _a.value) || 150; // KWD value
        const discount = durationDays === 14 ? 0.05 : durationDays === 28 ? 0.1 : 0;
        const totalMeals = durationDays * mealsPerDay;
        const totalPrice = Math.round(totalMeals * basePrice * (1 - discount));
        let subscriptionStatus = "pending";
        let transactionId;
        let paymentResponse = null;
        // ---------------- WALLET PAYMENT ----------------
        if (paymentMethod === "wallet") {
            const wallet = yield Wallet_1.Wallet.findOne({ userId });
            if (!wallet || wallet.balance < totalPrice)
                return res.status(400).json({ message: "Insufficient wallet balance" });
            const balanceBefore = wallet.balance;
            wallet.balance -= totalPrice;
            wallet.totalSpent += totalPrice;
            yield wallet.save();
            yield new Wallet_1.WalletHistory({
                userId,
                walletId: wallet._id,
                type: "payment",
                amount: totalPrice,
                currency: "KWD", // updated currency
                balanceBefore,
                balanceAfter: wallet.balance,
                description: "Subscription payment",
                status: "completed",
            }).save();
            subscriptionStatus = "active";
            transactionId = `WALLET_${Date.now()}`;
            const walletMsg = `Your subscription payment of ${totalPrice} KWD using wallet is completed.`;
            server_1.io.to(userId.toString()).emit("payment_notification", {
                message: walletMsg,
                amount: totalPrice,
                paymentMethod: "wallet",
            });
            yield (0, createNotification_1.createUserNotification)(userId, "Payment Success", walletMsg, "inApp");
        }
        // ---------------- CREATE SUBSCRIPTION ----------------
        const subscription = new Subscription_1.default({
            userId,
            planType,
            planName: `${durationDays}-day plan`,
            startDate,
            endDate: new Date(new Date(startDate).getTime() + durationDays * 86400000),
            mealsPerDay,
            totalMeals,
            price: totalPrice,
            status: subscriptionStatus,
            autoRenew,
            meals: [],
            payment: {
                gateway: paymentMethod,
                status: subscriptionStatus,
                amountPaid: subscriptionStatus === "active" ? totalPrice : 0,
                currency: "KWD", // updated currency
            },
        });
        yield subscription.save();
        // ---------------- STRIPE PAYMENT ----------------
        if (paymentMethod === "stripe") {
            const paymentIntent = yield stripe.paymentIntents.create({
                amount: totalPrice * 100,
                currency: "KWD", // updated currency
                metadata: { subscriptionId: subscription.id.toString(), userId },
            });
            transactionId = paymentIntent.id;
            paymentResponse = paymentIntent;
            subscriptionStatus = "pending";
        }
        // ---------------- CASH ON DELIVERY (COD) ----------------
        if (paymentMethod === "cod") {
            subscriptionStatus = "pending"; // COD subscription remains pending until payment collected
            transactionId = `COD_${Date.now()}`;
        }
        // ---------------- SAVE PAYMENT ----------------
        const paymentRecord = yield new Payment_1.default({
            userId,
            subscriptionId: subscription._id,
            amount: totalPrice,
            currency: "KWD", // updated currency
            gateway: paymentMethod,
            status: subscriptionStatus === "active" ? "completed" : "pending",
            transactionId,
        }).save();
        // ---------------- CREATE DAILY MEALS & ORDERS ----------------
        const orders = [];
        for (let day = 0; day < durationDays; day++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + day);
            const dailyMeals = { date, isLocked: day >= 3, status: "pending" };
            const orderMeals = [];
            for (let slot = 0; slot < mealsPerDay; slot++) {
                const selection = mealSelections[slot];
                if (!selection)
                    continue;
                const product = yield Product_1.default.findById(selection.productId);
                if (!product)
                    continue;
                dailyMeals[selection.mealType] = product._id;
                orderMeals.push({ slot: selection.mealType, productId: product._id, status: "scheduled" });
            }
            subscription.meals.push(dailyMeals);
            orders.push({
                subscriptionId: subscription._id,
                userId,
                date,
                meals: orderMeals,
                status: subscriptionStatus === "active" ? "scheduled" : "pending", // COD pending
            });
        }
        yield subscription.save();
        yield DailyOrder_1.DailyOrder.insertMany(orders);
        res.status(200).json({
            success: true,
            subscription,
            payment: paymentRecord,
            paymentResponse,
            message: paymentMethod === "cod" ? "Subscription created. Pay on delivery." : "Subscription created successfully."
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to create subscription", error: err });
    }
});
exports.createSubscriptionUser = createSubscriptionUser;
// -------------------- STRIPE WEBHOOK --------------------
const stripeWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }
    catch (err) {
        console.error(err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    // Handle payment events
    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const subscriptionId = paymentIntent.metadata.subscriptionId;
        const userId = paymentIntent.metadata.userId;
        const subscription = yield Subscription_1.default.findById(subscriptionId);
        if (!subscription)
            return res.status(404).json({ message: "Subscription not found" });
        // Update subscription status
        subscription.status = "active";
        subscription.payment.status = "completed";
        subscription.payment.amountPaid = paymentIntent.amount / 100;
        yield subscription.save();
        // Record payment
        const paymentRecord = yield new Payment_1.default({
            userId,
            subscriptionId,
            amount: paymentIntent.amount / 100,
            currency: "INR",
            gateway: "stripe",
            status: "completed",
            transactionId: paymentIntent.id,
        }).save();
        // ---------------- PAYMENT NOTIFICATION ----------------
        const msg = `Your payment of ₹${paymentRecord.amount} via Stripe is completed successfully.`;
        // Emit real-time notification via Socket.IO
        server_1.io.to(userId.toString()).emit("payment_notification", { message: msg, payment: paymentRecord });
        // Save notification in database
        yield (0, createNotification_1.createUserNotification)(userId.toString(), "Payment Success", msg, "inApp" // optional channel
        );
    }
    res.json({ received: true });
});
exports.stripeWebhook = stripeWebhook;
// -------------------- SUBSCRIPTION CONTROLS --------------------
// Pause subscription
const pauseSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sub = yield Subscription_1.default.findById(req.params.subscriptionId);
    // console.log(sub);
    if (!sub)
        return res.status(404).json({ message: "Subscription not found" });
    sub.isPaused = true;
    sub.status = "paused";
    yield sub.save();
    const msg = `Your subscription "${sub.planName}" has been paused.`;
    server_1.io.to(sub.userId.toString()).emit("subscription_notification", { message: msg });
    yield (0, createNotification_1.createUserNotification)(sub.userId.toString(), "Subscription Paused", msg, "inApp");
    res.json({ success: true, subscription: sub });
});
exports.pauseSubscription = pauseSubscription;
// Resume subscription
const resumeSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sub = yield Subscription_1.default.findById(req.params.subscriptionId);
    if (!sub)
        return res.status(404).json({ message: "Subscription not found" });
    sub.isPaused = false;
    sub.status = "resumed";
    yield sub.save();
    const msg = `Your subscription "${sub.planName}" has been resumed.`;
    server_1.io.to(sub.userId.toString()).emit("subscription_notification", { message: msg });
    yield (0, createNotification_1.createUserNotification)(sub.userId.toString(), "Subscription Resumed", msg, "inApp");
    res.json({ success: true, subscription: sub });
});
exports.resumeSubscription = resumeSubscription;
const cancelSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sub = yield Subscription_1.default.findById(req.params.subscriptionId);
    if (!sub)
        return res.status(404).json({ message: "Subscription not found" });
    sub.status = "cancelled";
    yield sub.save();
    const msg = `Your subscription "${sub.planName}" has been cancelled.`;
    server_1.io.to(sub.userId.toString()).emit("subscription_notification", { message: msg });
    yield (0, createNotification_1.createUserNotification)(sub.userId.toString(), "Subscription Cancelled", msg, "inApp");
    res.json({ success: true, subscription: sub });
});
exports.cancelSubscription = cancelSubscription;
// Freeze subscription
const freezeSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sub = yield Subscription_1.default.findById(req.params.subscriptionId);
    if (!sub)
        return res.status(404).json({ message: "Subscription not found" });
    sub.isFrozen = true;
    sub.status = "freeze";
    yield sub.save();
    const msg = `Your subscription "${sub.planName}" has been frozen.`;
    server_1.io.to(sub.userId.toString()).emit("subscription_notification", { message: msg });
    yield (0, createNotification_1.createUserNotification)(sub.userId.toString(), "Subscription Frozen", msg, "inApp");
    res.json({ success: true, subscription: sub });
});
exports.freezeSubscription = freezeSubscription;
// Deliver meal
const deliverMeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sub = yield Subscription_1.default.findById(req.params.subscriptionId);
    if (!sub)
        return res.status(404).json({ message: "Subscription not found" });
    sub.lastDeliveredAt = new Date();
    yield sub.save();
    const msg = `Your meal for subscription "${sub.planName}" has been delivered. Enjoy!`;
    server_1.io.to(sub.userId.toString()).emit("meal_notification", { message: msg });
    yield (0, createNotification_1.createUserNotification)(sub.userId.toString(), "Meal Delivered", msg, "inApp");
    res.json({ success: true, subscription: sub });
});
exports.deliverMeal = deliverMeal;
// Swap meal
const swapMeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { subscriptionId } = req.params;
    const { date, slot } = req.body;
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    const dailyOrder = yield DailyOrder_1.DailyOrder.findOne({ subscriptionId, date: { $gte: dayStart, $lte: dayEnd } });
    if (!dailyOrder)
        return res.status(404).json({ message: "Daily order not found" });
    const mealIndex = dailyOrder.meals.findIndex((m) => m.slot === slot);
    if (mealIndex === -1)
        return res.status(400).json({ message: "Meal slot not found" });
    let mealsList = mealCache.get(`meals_${slot}`) || [];
    if (!mealsList.length) {
        mealsList = yield Product_1.default.find({ type: slot, isActive: true });
        mealCache.set(`meals_${slot}`, mealsList);
    }
    if (!mealsList.length)
        return res.status(404).json({ message: "No meals available to swap" });
    const currentMealId = dailyOrder.meals[mealIndex].productId.toString();
    const filteredMeals = mealsList.filter((meal) => meal._id.toString() !== currentMealId);
    if (!filteredMeals.length)
        return res.status(400).json({ message: "No alternative meals available" });
    dailyOrder.meals[mealIndex].productId = filteredMeals[Math.floor(Math.random() * filteredMeals.length)]._id;
    yield dailyOrder.save();
    res.json({ success: true, dailyOrder });
});
exports.swapMeal = swapMeal;
// Get subscription by ID
const getSubscriptionById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sub = yield Subscription_1.default.findById(req.params.subscriptionId);
    if (!sub)
        return res.status(404).json({ message: "Subscription not found" });
    res.json({ success: true, subscription: sub });
});
exports.getSubscriptionById = getSubscriptionById;
const getSubscriptionPayments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subscriptionId } = req.body;
        if (!subscriptionId || !mongoose_1.default.Types.ObjectId.isValid(subscriptionId)) {
            return res.status(400).json({ success: false, message: "Invalid subscription ID" });
        }
        const subscription = yield Subscription_1.default.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ success: false, message: "Subscription not found" });
        }
        const payments = yield Payment_1.default.find({ subscriptionId }, "amount status createdAt gateway transactionId").lean();
        res.json({ success: true, payments });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Failed to fetch payments",
        });
    }
});
exports.getSubscriptionPayments = getSubscriptionPayments;
// Get all subscriptions
const getAllSubscriptions = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Step 1: Fetch all subscriptions with user populated
        const subs = yield Subscription_1.default.find()
            .populate("userId", "username email")
            .populate("meals.breakfast meals.lunch meals.dinner") // populate meal products
            .lean();
        // Step 2: Fetch payments for all subscriptionIds
        const subIds = subs.map((s) => s._id);
        const payments = yield Payment_1.default.find({ subscriptionId: { $in: subIds } }, "amount status createdAt gateway transactionId subscriptionId").lean();
        // Step 3: Group payments by subscriptionId
        const paymentsBySub = {};
        payments.forEach((p) => {
            const key = p.subscriptionId.toString();
            if (!paymentsBySub[key])
                paymentsBySub[key] = [];
            paymentsBySub[key].push(p);
        });
        const enriched = subs.map((sub) => {
            let user = null;
            // Type guard to check if userId is populated
            if (sub.userId) {
                if (typeof sub.userId === "object" && "username" in sub.userId && "email" in sub.userId) {
                    user = {
                        _id: sub.userId._id.toString(),
                        username: sub.userId.username,
                        email: sub.userId.email
                    };
                }
                else {
                    user = { _id: sub.userId.toString() };
                }
            }
            const mealsWithDetails = sub.meals.map((meal) => ({
                date: meal.date,
                breakfast: meal.breakfast
                    ? { _id: meal.breakfast._id, name: meal.breakfast.name, price: meal.breakfast.price }
                    : null,
                lunch: meal.lunch
                    ? { _id: meal.lunch._id, name: meal.lunch.name, price: meal.lunch.price }
                    : null,
                dinner: meal.dinner
                    ? { _id: meal.dinner._id, name: meal.dinner.name, price: meal.dinner.price }
                    : null,
                isLocked: meal.isLocked,
                status: meal.status,
            }));
            return Object.assign(Object.assign({}, sub), { user, meals: mealsWithDetails, payments: paymentsBySub[sub._id.toString()] || [] });
        });
        res.json({ success: true, subscriptions: enriched });
    }
    catch (err) {
        console.error("Error fetching subscriptions:", err);
        res.status(500).json({
            success: false,
            message: err.message || "Failed to fetch subscriptions",
        });
    }
});
exports.getAllSubscriptions = getAllSubscriptions;
// Get subscriptions by user
// Add this validation helper
const isValidObjectId = (id) => {
    return mongoose_1.default.Types.ObjectId.isValid(id);
};
// Example usage in your controllers:
const getSubscriptionsByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format"
            });
        }
        const subs = yield Subscription_1.default.find({ userId }).sort({ startDate: -1 });
        if (!subs.length) {
            return res.status(404).json({
                success: false,
                message: "No subscriptions found"
            });
        }
        res.json({ success: true, subscriptions: subs });
    }
    catch (error) {
        console.error("Error fetching user subscriptions:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch subscriptions",
            error: error.message
        });
    }
});
exports.getSubscriptionsByUser = getSubscriptionsByUser;
// Update subscription
const updateSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const updated = yield Subscription_1.default.findByIdAndUpdate(req.params.subscriptionId, req.body, { new: true });
    if (!updated)
        return res.status(404).json({ message: "Subscription not found" });
    res.json({ success: true, subscription: updated });
});
exports.updateSubscription = updateSubscription;
// Delete subscription
const deleteSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const deleted = yield Subscription_1.default.findByIdAndDelete(req.params.subscriptionId);
    if (!deleted)
        return res.status(404).json({ message: "Subscription not found" });
    res.json({ success: true, message: "Subscription deleted" });
});
exports.deleteSubscription = deleteSubscription;
// Get subscription stats
const getSubscriptionStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sub = yield Subscription_1.default.findById(req.params.subscriptionId);
    if (!sub)
        return res.status(404).json({ message: "Subscription not found" });
    const dailyOrdersCount = yield DailyOrder_1.DailyOrder.countDocuments({ subscriptionId: sub._id });
    res.json({ success: true, stats: { totalMeals: sub.totalMeals, dailyOrdersCount } });
});
exports.getSubscriptionStats = getSubscriptionStats;
// Get all stats
const getAllStats = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const totalSubscriptions = yield Subscription_1.default.countDocuments();
    const sub = yield Subscription_1.default.find();
    const activeSubscriptions = yield Subscription_1.default.countDocuments({ status: "active" });
    res.json({ success: true, stats: { totalSubscriptions, activeSubscriptions, subscription: sub } });
});
exports.getAllStats = getAllStats;
const createSubscriptionAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        const { durationDays, mealsPerDay, startDate, planType, planName, price, meals // meals array with structure [{ date, breakfast, lunch, dinner }]
         } = req.body;
        if (!userId)
            return res.status(400).json({ success: false, message: "userId is required" });
        if (!startDate)
            return res.status(400).json({ success: false, message: "startDate is required" });
        const user = yield User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
        const start = new Date(startDate);
        if (isNaN(start.getTime()))
            return res.status(400).json({ success: false, message: "Invalid startDate" });
        const duration = Number(durationDays);
        const mealsCount = Number(mealsPerDay);
        if (isNaN(duration) || isNaN(mealsCount))
            return res.status(400).json({ success: false, message: "Invalid durationDays or mealsPerDay" });
        // Prepare meals array if provided
        let mealSchedule = [];
        if (meals && Array.isArray(meals)) {
            for (const m of meals) {
                const breakfast = m.breakfast ? yield Product_1.default.findById(m.breakfast) : null;
                const lunch = m.lunch ? yield Product_1.default.findById(m.lunch) : null;
                const dinner = m.dinner ? yield Product_1.default.findById(m.dinner) : null;
                mealSchedule.push({
                    date: new Date(m.date),
                    breakfast: (breakfast === null || breakfast === void 0 ? void 0 : breakfast._id) || null,
                    lunch: (lunch === null || lunch === void 0 ? void 0 : lunch._id) || null,
                    dinner: (dinner === null || dinner === void 0 ? void 0 : dinner._id) || null,
                    isLocked: false,
                    status: "pending"
                });
            }
        }
        else {
            // Auto-generate meal schedule if meals not provided
            for (let i = 0; i < duration; i++) {
                const mealDate = new Date(start.getTime() + i * 86400000);
                mealSchedule.push({
                    date: mealDate,
                    breakfast: null,
                    lunch: null,
                    dinner: null,
                    isLocked: false,
                    status: "pending"
                });
            }
        }
        const subscription = new Subscription_1.default({
            userId,
            planType: planType || "basic",
            planName: planName || `${duration}-day plan`,
            startDate: start,
            endDate: new Date(start.getTime() + duration * 86400000),
            mealsPerDay: mealsCount,
            totalMeals: duration * mealsCount,
            price: price || 0,
            status: "active",
            autoRenew: false,
            meals: mealSchedule,
            consumedMeals: 0,
            remainingMeals: duration * mealsCount,
            deliveredMeals: 0,
            pendingDeliveries: duration * mealsCount,
        });
        yield subscription.save();
        res.status(200).json({ success: true, message: "Admin subscription created", subscription });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to create subscription", error: err.message });
    }
});
exports.createSubscriptionAdmin = createSubscriptionAdmin;
const handlePaymentWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subscriptionId, status, amountPaid, gateway, transactionId } = req.body;
        if (!subscriptionId || !status || !gateway) {
            return res.status(400).json({ success: false, message: "Missing required webhook fields" });
        }
        const subscription = yield Subscription_1.default.findById(subscriptionId);
        if (!subscription)
            return res.status(404).json({ success: false, message: "Subscription not found" });
        // Update subscription payment info
        subscription.status = status === "completed" ? "active" : subscription.status;
        subscription.payment = {
            gateway,
            status,
            amountPaid: amountPaid || subscription.payment.amountPaid || 0,
            currency: "INR",
            discountApplied: 0,
            balanceRemaining: 0
        };
        yield subscription.save();
        // Record payment
        const paymentRecord = yield new Payment_1.default({
            userId: subscription.userId,
            subscriptionId: subscription._id,
            amount: amountPaid || 0,
            currency: "INR",
            gateway,
            status,
            transactionId: transactionId || `GEN_${Date.now()}`,
        }).save();
        // ---------------- PAYMENT NOTIFICATION ----------------
        const msg = `Your payment of ₹${paymentRecord.amount} via ${gateway} is ${status}.`;
        // Emit real-time notification via Socket.IO
        server_1.io.to(subscription.userId.toString()).emit("payment_notification", {
            message: msg,
            payment: paymentRecord,
        });
        // Save notification in the database
        yield (0, createNotification_1.createUserNotification)(subscription.userId.toString(), // user ID
        "Payment Success", // title
        msg, // message (I changed 'wallet' to msg to match your notification)
        "inApp" // optional channel
        );
        res.status(200).json({ success: true, message: "Webhook processed", subscription, payment: paymentRecord });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to process webhook", error: err });
    }
});
exports.handlePaymentWebhook = handlePaymentWebhook;
const getSetting = (key, defaultValue) => __awaiter(void 0, void 0, void 0, function* () {
    const setting = yield SystemSettings_1.default.findOne({ key });
    return setting ? setting.value : defaultValue;
});
/**
 * CREATE SUBSCRIPTION
 */
const createSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { userId, planDuration, mealsPerDay, startDate, mealPreferences, planType, paymentMethodId, } = req.body;
        const user = yield User_1.default.findById(userId).session(session);
        if (!user)
            return res.status(401).json({ message: "User not found" });
        if (!planDuration || !mealsPerDay || !startDate)
            return res.status(400).json({ message: "Missing required fields" });
        const productsQuery = { isActive: true };
        if (mealPreferences === null || mealPreferences === void 0 ? void 0 : mealPreferences.length)
            productsQuery.mealType = { $in: mealPreferences };
        const products = yield Product_1.default.find(productsQuery).session(session);
        if (!products.length)
            return res.status(400).json({ message: "No matching products found" });
        let totalPrice = 0;
        const defaultMeals = [];
        for (let i = 0; i < planDuration; i++) {
            for (let j = 0; j < mealsPerDay; j++) {
                const product = products[Math.floor(Math.random() * products.length)];
                defaultMeals.push(product._id);
                totalPrice += product.price;
            }
        }
        const discounts = yield getSetting("subscription.discountSlabs", {
            "7": 2,
            "14": 5,
            "28": 10,
        });
        if (discounts[planDuration])
            totalPrice *= (100 - discounts[planDuration]) / 100;
        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = yield stripe.customers.create({
                name: user.username,
                email: user.email,
            });
            stripeCustomerId = customer.id;
            user.stripeCustomerId = stripeCustomerId;
            yield user.save({ session });
        }
        const amount = Math.round(totalPrice * 100);
        const paymentIntent = yield stripe.paymentIntents.create({
            amount,
            currency: "inr",
            payment_method: paymentMethodId,
            customer: stripeCustomerId,
            confirm: true,
            off_session: true,
            metadata: { userId: user.id.toString(), planDuration: planDuration.toString() },
        });
        const payment = yield Payment_2.default.create([
            {
                userId,
                subscriptionId: null,
                amount: totalPrice,
                currency: "INR",
                gateway: "stripe",
                status: paymentIntent.status === "succeeded" ? "completed" : "pending",
                transactionId: paymentIntent.id,
            },
        ], { session });
        const subscription = yield Subscription_1.default.create([
            {
                userId,
                planType: planType || "basic",
                planName: `${planDuration}-Day Plan`,
                startDate,
                endDate: new Date(new Date(startDate).setDate(new Date(startDate).getDate() + planDuration - 1)),
                mealsPerDay,
                totalMeals: planDuration * mealsPerDay,
                consumedMeals: 0,
                remainingMeals: planDuration * mealsPerDay,
                price: totalPrice,
                currency: "INR",
                billingCycle: "monthly",
                autoRenew: true,
                payment: {
                    gateway: "stripe",
                    status: paymentIntent.status === "succeeded" ? "paid" : "pending",
                    amountPaid: totalPrice,
                    currency: "INR",
                    transactionId: paymentIntent.id,
                },
                meals: Array.from({ length: planDuration }, (_, i) => {
                    const date = new Date(startDate);
                    date.setDate(date.getDate() + i);
                    return Array.from({ length: mealsPerDay }, (_, slot) => ({
                        date,
                        isLocked: i >= 3,
                    }));
                }).flat(),
            },
        ], { session });
        yield Payment_2.default.findByIdAndUpdate(payment[0]._id, { subscriptionId: subscription[0]._id }, { session });
        const orders = [];
        for (let i = 0; i < planDuration; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const meals = [];
            for (let slot = 0; slot < mealsPerDay; slot++) {
                const productIndex = i * mealsPerDay + slot;
                meals.push({
                    slot: mealsPerDay === 2 ? (slot === 0 ? "lunch" : "dinner") : slot === 0 ? "breakfast" : slot === 1 ? "lunch" : "dinner",
                    productId: defaultMeals[productIndex],
                    status: "scheduled",
                });
            }
            orders.push({ subscriptionId: subscription[0]._id, userId, date, meals });
        }
        yield DailyOrder_1.DailyOrder.insertMany(orders, { session });
        yield session.commitTransaction();
        session.endSession();
        res.status(201).json({
            subscription: subscription[0],
            totalPrice,
            payment: payment[0],
            message: "Subscription created & payment captured successfully",
        });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        console.error("Subscription creation error:", error);
        res.status(500).json({ message: "Error creating subscription", error: error.message });
    }
});
exports.createSubscription = createSubscription;
/**
 * PAUSE / RESUME SUBSCRIPTION
 */
const toggleSubscriptionStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subscriptionId } = req.params;
        const { action } = req.body;
        const maxPauseTimes = yield getSetting("subscription.maxPauseTimes", 2);
        const subscription = yield Subscription_1.default.findById(subscriptionId);
        if (!subscription)
            return res.status(404).json({ message: "Subscription not found" });
        if (action === "pause") {
            if ((subscription.pauseCount || 0) >= maxPauseTimes)
                return res.status(400).json({ message: "Pause limit reached" });
            subscription.isPaused = true;
            subscription.pauseCount = (subscription.pauseCount || 0) + 1;
        }
        else {
            subscription.isPaused = false;
        }
        if (action === "cancel") {
            subscription.status = "cancelled";
        }
        if (action === "delivered") {
            subscription.status = "delivered";
        }
        if (action === "freeze") {
            subscription.status = "freeze";
            subscription.isFrozen = true;
        }
        if (action === "resume") {
            subscription.status = "resumed";
        }
        if (action == "swap") {
            subscription.status = "swappable";
        }
        yield subscription.save();
        res.json({ subscription, message: `Subscription ${action}d successfully` });
    }
    catch (error) {
        res.status(500).json({ message: "Error updating subscription", error });
    }
});
exports.toggleSubscriptionStatus = toggleSubscriptionStatus;
/**
 * REFUND PROCESSING
 */
const processRefund = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { subscriptionId, reason } = req.body;
        const refundPolicy = yield getSetting("subscription.refundPolicy", {
            type: "partial",
            graceDays: 3,
        });
        const subscription = yield Subscription_1.default.findById(subscriptionId);
        if (!subscription)
            return res.status(404).json({ message: "Subscription not found" });
        let refundAmount = 0;
        const daysConsumed = subscription.completedDays || 0;
        if (refundPolicy.type === "full" && daysConsumed <= refundPolicy.graceDays) {
            refundAmount = subscription.price;
        }
        else if (refundPolicy.type === "partial") {
            const unusedMeals = subscription.totalMeals - subscription.consumedMeals;
            refundAmount = (unusedMeals / subscription.totalMeals) * subscription.price;
        }
        subscription.status = "refunded";
        subscription.refundAmount = refundAmount;
        subscription.refundReason = reason;
        yield subscription.save();
        if ((_a = subscription.payment) === null || _a === void 0 ? void 0 : _a.transactionId) {
            yield stripe.refunds.create({ payment_intent: subscription.payment.transactionId });
        }
        res.json({ subscription, message: `Refund processed: ₹${refundAmount}` });
    }
    catch (error) {
        res.status(500).json({ message: "Error processing refund", error });
    }
});
exports.processRefund = processRefund;
/**
 * LOCK MEALS AFTER CHANGE WINDOW
 */
const lockMealsAfterChangeWindow = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch setting from DB or fallback to default 3 days
        const changeWindowDays = yield getSetting("subscription.changeWindowDays", 3);
        // Get all active subscriptions
        const subscriptions = yield Subscription_1.default.find({ status: { $in: ["active", "paused"] } });
        const now = new Date();
        for (const sub of subscriptions) {
            // Calculate lock date (start date + change window)
            const lockDate = new Date(sub.startDate);
            lockDate.setDate(lockDate.getDate() + changeWindowDays);
            // If current date > lockDate, lock all meals for this subscription
            if (now > lockDate) {
                yield DailyOrder_1.DailyOrder.updateMany({ subscriptionId: sub._id }, { $set: { "meals.$[].locked": true } });
            }
        }
        console.log(`✅ Meal lock job executed. Checked ${subscriptions.length} subscriptions.`);
    }
    catch (error) {
        console.error("❌ Error locking meals after change window:", error);
    }
});
exports.lockMealsAfterChangeWindow = lockMealsAfterChangeWindow;
/**
 * AUTO-RENEW SUBSCRIPTIONS (CRON)
 */
const autoRenewSubscriptions = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const autoRenewEnabled = yield getSetting("subscription.autoRenewEnabled", true);
        if (!autoRenewEnabled)
            return;
        const expiringSubs = yield Subscription_1.default.find({
            endDate: { $lte: new Date() },
            autoRenew: true,
            status: "active",
        });
        for (const sub of expiringSubs) {
            try {
                if (!sub.userId)
                    continue;
                const user = yield User_1.default.findById(sub.userId);
                if (!user || !user.stripeCustomerId || !user.stripePaymentMethodId)
                    continue;
                const paymentIntent = yield stripe.paymentIntents.create({
                    amount: Math.round(sub.price * 100),
                    currency: "inr",
                    customer: user.stripeCustomerId,
                    payment_method: user.stripePaymentMethodId,
                    off_session: true,
                    confirm: true,
                    metadata: { subscriptionId: sub.id.toString() },
                });
                if (paymentIntent.status === "succeeded") {
                    sub.startDate = new Date();
                    sub.endDate = new Date(new Date().setDate(new Date().getDate() + (sub.durationDays || 7)));
                    yield sub.save();
                }
            }
            catch (err) {
                console.error("Auto-renewal failed:", err);
            }
        }
    }
    catch (error) {
        console.error("Error in auto renewal:", error);
    }
});
exports.autoRenewSubscriptions = autoRenewSubscriptions;
/**
 * SYSTEM SETTINGS CRUD
 */
const upsertSetting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key, value, description, category } = req.body;
        const setting = yield SystemSettings_1.default.findOneAndUpdate({ key }, { value, description, category }, { new: true, upsert: true });
        res.json({ message: "Setting saved successfully", setting });
    }
    catch (error) {
        res.status(500).json({ message: "Error saving setting", error });
    }
});
exports.upsertSetting = upsertSetting;
const getSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category } = req.query;
        const filter = category ? { category } : {};
        const settings = yield SystemSettings_1.default.find(filter);
        res.json({ settings });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching settings", error });
    }
});
exports.getSettings = getSettings;
const deleteSetting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const result = yield SystemSettings_1.default.findOneAndDelete({ key });
        if (!result)
            return res.status(404).json({ message: "Setting not found" });
        res.json({ message: "Setting deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting setting", error });
    }
});
exports.deleteSetting = deleteSetting;
const createSubscriptionWithMealSelection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const userId = req.params.userId;
        const { planDuration, startDate, mealSelections, planType, paymentMethod, paymentMethodId, } = req.body;
        if (!planDuration || !startDate || !mealSelections) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Missing required fields" });
        }
        if (mealSelections.length !== planDuration) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                message: "Meal selections length must match plan duration",
            });
        }
        const user = yield User_1.default.findById(userId).session(session);
        if (!user) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "User not found" });
        }
        // ---------------- Meal Cost Calculation ----------------
        let totalCostPrice = 0;
        let totalPrice = 0;
        const mealDetailsByDay = [];
        for (const day of mealSelections) {
            const dayMeals = [];
            const slots = ["breakfast", "lunch", "dinner"];
            for (const slot of slots) {
                const productId = day[slot];
                if (!productId)
                    continue;
                const product = yield Product_1.default.findById(productId).session(session);
                if (!product || !product.isActive) {
                    yield session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({ message: `Invalid or inactive product for ${slot} on ${day.date}` });
                }
                const costPrice = (_a = product.costPrice) !== null && _a !== void 0 ? _a : 0;
                const price = (_b = product.price) !== null && _b !== void 0 ? _b : costPrice;
                totalCostPrice += costPrice;
                totalPrice += price;
                dayMeals.push({
                    slot,
                    productId: product._id,
                    productDetails: {
                        name: product.name,
                        description: product.description,
                        costPrice,
                        price,
                        mealType: product.mealType,
                    },
                    status: "scheduled",
                });
            }
            mealDetailsByDay.push({ date: new Date(day.date), meals: dayMeals });
        }
        // ---------------- Discount ----------------
        const discountSlabs = yield getSetting("subscription.discountSlabs", { "7": 2, "14": 5, "28": 10 });
        const discountPercent = discountSlabs[planDuration.toString()] || 0;
        const discountedTotalPrice = parseFloat((totalPrice * ((100 - discountPercent) / 100)).toFixed(2));
        const totalProfit = discountedTotalPrice - totalCostPrice;
        // ---------------- Create Subscription ----------------
        const subscription = new Subscription_1.default({
            userId,
            planType: planType || "basic",
            planName: `${planDuration}-Day Custom Plan`,
            startDate: new Date(startDate),
            endDate: new Date(new Date(startDate).setDate(new Date(startDate).getDate() + planDuration - 1)),
            mealsPerDay: Math.max(...mealDetailsByDay.map(d => d.meals.length)),
            totalMeals: mealDetailsByDay.reduce((acc, day) => acc + day.meals.length, 0),
            consumedMeals: 0,
            remainingMeals: mealDetailsByDay.reduce((acc, day) => acc + day.meals.length, 0),
            price: discountedTotalPrice,
            totalCost: totalCostPrice,
            totalProfit,
            currency: "KWD",
            billingCycle: planDuration === 7 ? "weekly" : planDuration === 14 ? "2-weeks" : "monthly",
            autoRenew: false,
            status: "pending",
            payment: {
                gateway: paymentMethod || "manual",
                status: "pending",
                amountPaid: 0,
                currency: "KWD",
                discountApplied: discountPercent,
            },
            meals: mealDetailsByDay.map(day => {
                var _a, _b, _c;
                return ({
                    date: day.date,
                    breakfast: (_a = day.meals.find(m => m.slot === "breakfast")) === null || _a === void 0 ? void 0 : _a.productId,
                    lunch: (_b = day.meals.find(m => m.slot === "lunch")) === null || _b === void 0 ? void 0 : _b.productId,
                    dinner: (_c = day.meals.find(m => m.slot === "dinner")) === null || _c === void 0 ? void 0 : _c.productId,
                    isLocked: false,
                    status: "scheduled",
                });
            }),
        });
        const subscriptionDoc = yield subscription.save({ session });
        // ---------------- Create Daily Orders ----------------
        const dailyOrders = mealDetailsByDay.map(day => {
            let totalPricePerDay = 0;
            let totalCostPricePerDay = 0;
            const mealsWithPrices = day.meals.map(meal => {
                var _a, _b;
                const price = (_a = meal.productDetails.price) !== null && _a !== void 0 ? _a : 0;
                const costPrice = (_b = meal.productDetails.costPrice) !== null && _b !== void 0 ? _b : 0;
                totalPricePerDay += price;
                totalCostPricePerDay += costPrice;
                return Object.assign(Object.assign({}, meal), { price, costPrice });
            });
            return {
                subscriptionId: subscriptionDoc._id,
                userId,
                date: day.date,
                meals: mealsWithPrices,
                totalPrice: totalPricePerDay,
                totalCost: totalCostPricePerDay,
                status: "scheduled",
            };
        });
        yield DailyOrder_1.DailyOrder.insertMany(dailyOrders, { session });
        // ---------------- Payment Handling ----------------
        let paymentRecord = null;
        let chargedPaymentIntentId = null;
        try {
            if (paymentMethod === "stripe" && paymentMethodId) {
                let stripeCustomerId = user.stripeCustomerId;
                if (!stripeCustomerId) {
                    const customer = yield stripe.customers.create({ name: user.username, email: user.email });
                    stripeCustomerId = customer.id;
                    user.stripeCustomerId = stripeCustomerId;
                    yield user.save({ session });
                }
                const paymentIntent = yield stripe.paymentIntents.create({
                    amount: Math.round(discountedTotalPrice * 100),
                    currency: "KWD",
                    payment_method: paymentMethodId,
                    customer: stripeCustomerId,
                    confirm: true,
                    off_session: true,
                    metadata: { subscriptionId: subscriptionDoc.id.toString(), userId: user.id.toString() }
                });
                chargedPaymentIntentId = paymentIntent.id;
                paymentRecord = yield Payment_2.default.create([{
                        userId,
                        subscriptionId: subscriptionDoc._id,
                        amount: discountedTotalPrice,
                        currency: "KWD",
                        gateway: "stripe",
                        status: paymentIntent.status === "succeeded" ? "completed" : "pending",
                        transactionId: paymentIntent.id,
                    }], { session });
                if (paymentIntent.status === "succeeded") {
                    subscriptionDoc.payment.status = "completed";
                    subscriptionDoc.payment.amountPaid = discountedTotalPrice;
                    subscriptionDoc.status = "active";
                    yield subscriptionDoc.save({ session });
                }
                else {
                    throw new Error(`Payment failed with status: ${paymentIntent.status}`);
                }
            }
            if (paymentMethod === "cod") {
                paymentRecord = yield Payment_2.default.create([{
                        userId,
                        subscriptionId: subscriptionDoc._id,
                        amount: discountedTotalPrice,
                        currency: "KWD",
                        gateway: "cod",
                        status: "pending",
                    }], { session });
                subscriptionDoc.payment.status = "pending";
                subscriptionDoc.payment.gateway = "cod";
                subscriptionDoc.status = "pending";
                yield subscriptionDoc.save({ session });
            }
        }
        catch (paymentError) {
            // ---------------- Payment failed: refund or abort ----------------
            console.error("Payment Error:", paymentError);
            if (chargedPaymentIntentId) {
                try {
                    yield stripe.refunds.create({ payment_intent: chargedPaymentIntentId });
                    console.log("Refund issued for failed payment:", chargedPaymentIntentId);
                }
                catch (refundError) {
                    console.error("Refund failed:", refundError);
                }
            }
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Payment failed, subscription not created, amount refunded if charged.",
                error: paymentError.message,
            });
        }
        yield session.commitTransaction();
        session.endSession();
        return res.status(201).json({
            success: true,
            subscription: subscriptionDoc,
            totalCost: totalCostPrice,
            totalPrice: discountedTotalPrice,
            totalProfit,
            discountApplied: discountPercent,
            payment: paymentRecord,
            message: "Custom meal subscription created successfully",
        });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        console.error("Custom subscription creation error:", error);
        return res.status(500).json({ success: false, message: "Error creating custom meal subscription", error: error.message });
    }
});
exports.createSubscriptionWithMealSelection = createSubscriptionWithMealSelection;
const paySubscriptionAmount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    let chargedPaymentIntentId = null;
    try {
        const { subscriptionId } = req.params;
        let { amount, userId, paymentMethod, paymentMethodId } = req.body;
        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }
        amount = parseFloat(parseFloat(amount).toFixed(2));
        const subscription = yield Subscription_1.default.findById(subscriptionId).session(session);
        if (!subscription)
            return res.status(404).json({ message: "Subscription not found" });
        const user = yield User_1.default.findById(userId).session(session);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const discountApplied = subscription.payment.discountApplied || 0;
        const totalPayable = parseFloat((subscription.price * (1 - discountApplied / 100)).toFixed(2));
        const remainingToPay = parseFloat((totalPayable - subscription.payment.amountPaid).toFixed(2));
        if (remainingToPay <= 0) {
            return res.status(400).json({ message: "Subscription already fully paid" });
        }
        const finalAmount = Math.min(amount, remainingToPay);
        let paymentRecord = null;
        // ---------------- Stripe Payment ----------------
        if (paymentMethod === "stripe") {
            let stripeCustomerId = user.stripeCustomerId;
            if (!stripeCustomerId) {
                const customer = yield stripe.customers.create({
                    name: user.username,
                    email: user.email,
                });
                stripeCustomerId = customer.id;
                user.stripeCustomerId = stripeCustomerId;
                yield user.save({ session });
            }
            const paymentIntent = yield stripe.paymentIntents.create({
                amount: Math.round(finalAmount * 100),
                currency: "KWD",
                customer: stripeCustomerId,
                payment_method: paymentMethodId,
                confirm: true,
                off_session: true,
                metadata: {
                    subscriptionId: subscription.id.toString(),
                    userId: user.id.toString(),
                    type: "subscription_payment",
                },
            });
            chargedPaymentIntentId = paymentIntent.id;
            paymentRecord = yield Payment_2.default.create([
                {
                    userId,
                    subscriptionId: subscription._id,
                    amount: finalAmount,
                    currency: "KWD",
                    gateway: "stripe",
                    status: paymentIntent.status === "succeeded" ? "paid" : "pending",
                    transactionId: paymentIntent.id,
                },
            ], { session });
            if (paymentIntent.status !== "succeeded") {
                throw new Error(`Payment failed with status: ${paymentIntent.status}`);
            }
        }
        // ---------------- COD Payment ----------------
        else if (paymentMethod === "cod") {
            paymentRecord = yield Payment_2.default.create([
                {
                    userId,
                    subscriptionId: subscription._id,
                    amount: finalAmount,
                    currency: "KWD",
                    gateway: "cod",
                    status: "pending",
                },
            ], { session });
        }
        else {
            return res.status(400).json({ message: "Invalid payment method" });
        }
        // ---------------- Update subscription ----------------
        subscription.payment.amountPaid = parseFloat((subscription.payment.amountPaid + finalAmount).toFixed(2));
        subscription.payment.balanceRemaining = parseFloat(Math.max(totalPayable - subscription.payment.amountPaid, 0).toFixed(2));
        subscription.payment.status =
            subscription.payment.amountPaid >= totalPayable ? "completed" : "pending";
        subscription.status =
            subscription.payment.status === "completed" ? "active" : "pending";
        yield subscription.save({ session });
        yield session.commitTransaction();
        return res.status(200).json({
            success: true,
            subscription,
            payment: paymentRecord[0],
            message: "Payment processed successfully",
        });
    }
    catch (error) {
        // ---------------- Refund if Stripe payment succeeded but failed afterward ----------------
        if (chargedPaymentIntentId) {
            try {
                yield stripe.refunds.create({ payment_intent: chargedPaymentIntentId });
                console.log("Refund issued for failed payment:", chargedPaymentIntentId);
            }
            catch (refundError) {
                console.error("Refund failed:", refundError);
            }
        }
        yield session.abortTransaction();
        console.error("Payment error:", error);
        return res.status(500).json({
            success: false,
            message: "Payment failed, amount refunded if charged.",
            error: error.message,
        });
    }
    finally {
        session.endSession();
    }
});
exports.paySubscriptionAmount = paySubscriptionAmount;
