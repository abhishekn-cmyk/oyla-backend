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
exports.deleteSetting = exports.getSettings = exports.upsertSetting = exports.autoRenewSubscriptions = exports.lockMealsAfterChangeWindow = exports.processRefund = exports.toggleSubscriptionStatus = exports.createSubscription = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const stripe_1 = __importDefault(require("stripe"));
const User_1 = __importDefault(require("../models/User"));
const Subscription_1 = __importDefault(require("../models/Subscription"));
const DailyOrder_1 = require("../models/DailyOrder");
const Product_1 = __importDefault(require("../models/Product"));
const Payment_1 = __importDefault(require("../models/Payment"));
const SystemSettings_1 = __importDefault(require("../models/SystemSettings"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
/**
 * UTILITY: GET SETTING WITH DEFAULT
 */
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
        const payment = yield Payment_1.default.create([
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
        yield Payment_1.default.findByIdAndUpdate(payment[0]._id, { subscriptionId: subscription[0]._id }, { session });
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
        const changeWindowDays = yield getSetting("subscription.changeWindowDays", 3);
        const subscriptions = yield Subscription_1.default.find();
        for (const sub of subscriptions) {
            const lockDate = new Date(sub.startDate);
            lockDate.setDate(lockDate.getDate() + changeWindowDays);
            if (new Date() > lockDate) {
                yield DailyOrder_1.DailyOrder.updateMany({ subscriptionId: sub._id }, { $set: { "meals.$[].locked": true } });
            }
        }
    }
    catch (error) {
        console.error("Error locking meals:", error);
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
