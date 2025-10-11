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
exports.processRefund = exports.getDeliveryDelayReport = exports.getRevenueReport = exports.lockMealsAfterChangeWindow = exports.toggleSubscriptionStatus = exports.updateDeliveryStatus = exports.assignDelivery = exports.updateDeliveryPartnerStatus = exports.getDeliveryPartners = exports.createDeliveryPartner = exports.updateProduct = exports.getProducts = exports.createProduct = exports.getDailyOrders = exports.adminUpdateDailyOrder = exports.updateDailyOrder = exports.getAllSubscriptions = exports.getUserSubscriptions = exports.stripeWebhook = exports.createSubscription = void 0;
const Subscription_1 = __importDefault(require("../models/Subscription"));
const DailyOrder_1 = require("../models/DailyOrder");
const Product_1 = __importDefault(require("../models/Product"));
const DeliveryPartner_1 = __importDefault(require("../models/DeliveryPartner"));
const Delivery_1 = __importDefault(require("../models/Delivery"));
const User_1 = __importDefault(require("../models/User"));
const stripe_1 = __importDefault(require("stripe"));
const Payment_1 = __importDefault(require("../models/Payment"));
const mongoose_1 = __importDefault(require("mongoose"));
const Delivery_2 = __importDefault(require("../models/Delivery"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
});
// ------------------- SUBSCRIPTION -------------------
const createSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { userId, planDuration, mealsPerDay, startDate, mealPreferences = [], // e.g. ["breakfast", "lunch", "dinner"]
        planType, } = req.body;
        // ✅ Validate user
        const user = yield User_1.default.findById(userId).session(session);
        if (!user)
            return res.status(401).json({ message: "User not authenticated" });
        if (!planDuration || !mealsPerDay || !startDate) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        // ✅ Fetch products based on meal preferences
        const query = { isActive: true };
        if (mealPreferences.length)
            query.mealType = { $in: mealPreferences };
        const products = yield Subscription_1.default.find(query).session(session);
        if (!products.length)
            return res.status(400).json({ message: "No available products match preferences" });
        // ✅ Calculate total price and pick random meals
        let totalPrice = 0;
        const defaultMeals = [];
        for (let i = 0; i < planDuration; i++) {
            for (let j = 0; j < mealsPerDay; j++) {
                const product = products[Math.floor(Math.random() * products.length)];
                defaultMeals.push(product._id);
                totalPrice += product.price;
            }
        }
        // ✅ Apply discount
        if (planDuration === 7)
            totalPrice *= 0.98;
        if (planDuration === 14)
            totalPrice *= 0.95;
        if (planDuration === 28)
            totalPrice *= 0.9;
        // ✅ Create Stripe payment intent
        const amount = Math.round(totalPrice * 100);
        const paymentIntent = yield stripe.paymentIntents.create({
            amount,
            currency: "inr",
            payment_method: "pm_card_visa",
            confirm: true,
            automatic_payment_methods: { enabled: true, allow_redirects: "never" },
            metadata: {
                userId: userId.toString(),
                planDuration: planDuration.toString(),
            },
        });
        // ✅ Save payment in DB
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
        // ✅ Create subscription
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
                    return mealPreferences.map(() => ({
                        date,
                        isLocked: i >= 3,
                    }));
                }).flat(),
            },
        ], { session });
        // ✅ Update payment with subscriptionId
        yield Payment_1.default.findByIdAndUpdate(payment[0]._id, {
            subscriptionId: subscription[0]._id,
        }).session(session);
        // ✅ Create daily orders dynamically based on mealPreferences
        const orders = [];
        for (let i = 0; i < planDuration; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const meals = mealPreferences.map((mealType, slot) => ({
                slot: mealType,
                productId: defaultMeals[i * mealsPerDay + slot],
                status: "scheduled",
            }));
            orders.push({
                subscriptionId: subscription[0]._id,
                userId,
                date,
                meals,
            });
        }
        yield DailyOrder_1.DailyOrder.insertMany(orders, { session });
        // ✅ Commit
        yield session.commitTransaction();
        session.endSession();
        res.status(201).json({
            subscription: subscription[0],
            totalPrice,
            payment: payment[0],
            message: "Subscription created and payment captured successfully",
        });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        console.error("Subscription creation error:", error);
        if (error === null || error === void 0 ? void 0 : error.paymentIntentId) {
            try {
                yield stripe.refunds.create({ payment_intent: error.paymentIntentId });
            }
            catch (refundErr) {
                console.error("Error refunding failed payment:", refundErr);
            }
        }
        res.status(500).json({ message: "Error creating subscription", error: error.message });
    }
});
exports.createSubscription = createSubscription;
// ------------------- STRIPE WEBHOOK -------------------
const stripeWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        // @ts-ignore
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log(event);
    }
    catch (err) {
        console.log("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const userId = paymentIntent.metadata.userId;
        const planDuration = parseInt(paymentIntent.metadata.planDuration);
        const subscription = yield Subscription_1.default.findOne({ userId });
        if (subscription) {
            subscription.payment.status = "paid";
            subscription.payment.transactionId = paymentIntent.id;
            subscription.payment.amountPaid = paymentIntent.amount / 100;
            subscription.payment.paymentDate = new Date();
            yield subscription.save();
            console.log(`Superadmin notified: User ${userId} paid subscription ${subscription._id}`);
        }
    }
    res.json({ received: true });
});
exports.stripeWebhook = stripeWebhook;
// ------------------- GET SUBSCRIPTIONS -------------------
const getUserSubscriptions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // user ID from route param
        if (!id)
            return res.status(400).json({ message: "User ID is required" });
        const subscriptions = yield Subscription_1.default.find({ userId: id }).populate("userId").lean();
        res.json(subscriptions);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching subscriptions", error });
    }
});
exports.getUserSubscriptions = getUserSubscriptions;
const getAllSubscriptions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subscriptions = yield Subscription_1.default.find().populate("userId").lean();
        res.json(subscriptions);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching subscriptions", error });
    }
});
exports.getAllSubscriptions = getAllSubscriptions;
// ------------------- DAILY ORDERS -------------------
const updateDailyOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId } = req.params;
    const { meals } = req.body;
    try {
        const order = yield DailyOrder_1.DailyOrder.findById(orderId);
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        const subscription = yield Subscription_1.default.findById(order.subscriptionId);
        if (!subscription || !subscription.startDate) {
            return res.status(400).json({ message: "Invalid subscription or start date" });
        }
        // Now TypeScript knows startDate is defined
        const changeWindowEnd = new Date(subscription.startDate);
        changeWindowEnd.setDate(changeWindowEnd.getDate() + 3);
        if (new Date() > changeWindowEnd) {
            return res.status(403).json({ message: "Meal change window expired" });
        }
        order.meals = meals;
        yield order.save();
        res.json({ order, message: "Meals updated successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Error updating order", error });
    }
});
exports.updateDailyOrder = updateDailyOrder;
const adminUpdateDailyOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId } = req.params;
    const { meals } = req.body;
    try {
        const order = yield DailyOrder_1.DailyOrder.findById(orderId);
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        order.meals = meals;
        yield order.save();
        res.json({ order, message: "Order updated by admin" });
    }
    catch (error) {
        res.status(500).json({ message: "Error updating order", error });
    }
});
exports.adminUpdateDailyOrder = adminUpdateDailyOrder;
const getDailyOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // user ID from route param
        if (!id)
            return res.status(400).json({ message: "User ID is required" });
        const orders = yield DailyOrder_1.DailyOrder.find({ userId: id })
            .populate("meals.productId")
            .populate("subscriptionId")
            .lean();
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching daily orders", error });
    }
});
exports.getDailyOrders = getDailyOrders;
// ------------------- PRODUCT / MEAL CATALOG -------------------
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const product = yield Product_1.default.create(req.body);
        res.status(201).json(product);
    }
    catch (error) {
        res.status(500).json({ message: "Error creating product", error });
    }
});
exports.createProduct = createProduct;
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield Product_1.default.find();
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching products", error });
    }
});
exports.getProducts = getProducts;
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updated = yield Product_1.default.findByIdAndUpdate(req.params.productId, req.body, { new: true });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: "Error updating product", error });
    }
});
exports.updateProduct = updateProduct;
// ------------------- DELIVERY PARTNER -------------------
const createDeliveryPartner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partner = yield DeliveryPartner_1.default.create(req.body);
        res.status(201).json(partner);
    }
    catch (error) {
        res.status(500).json({ message: "Error creating delivery partner", error });
    }
});
exports.createDeliveryPartner = createDeliveryPartner;
const getDeliveryPartners = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partners = yield DeliveryPartner_1.default.find();
        res.json(partners);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching partners", error });
    }
});
exports.getDeliveryPartners = getDeliveryPartners;
const updateDeliveryPartnerStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { partnerId } = req.params;
        const { status } = req.body;
        const partner = yield DeliveryPartner_1.default.findById(partnerId);
        if (!partner)
            return res.status(404).json({ message: "Partner not found" });
        partner.currentStatus = status;
        yield partner.save();
        res.json(partner);
    }
    catch (error) {
        res.status(500).json({ message: "Error updating partner status", error });
    }
});
exports.updateDeliveryPartnerStatus = updateDeliveryPartnerStatus;
// ------------------- DELIVERY -------------------
const assignDelivery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { deliveryId, deliveryPartnerId } = req.body;
    try {
        const delivery = yield Delivery_1.default.findById(deliveryId);
        if (!delivery)
            return res.status(404).json({ message: "Delivery not found" });
        const partner = yield DeliveryPartner_1.default.findById(deliveryPartnerId);
        if (!partner || partner.currentStatus !== "available")
            return res.status(400).json({ message: "Partner unavailable" });
        delivery.deliveryPartnerId = deliveryPartnerId;
        delivery.status = "assigned";
        delivery.assignedAt = new Date();
        yield delivery.save();
        partner.currentStatus = "busy";
        yield partner.save();
        res.json({ delivery, message: "Delivery assigned successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Error assigning delivery", error });
    }
});
exports.assignDelivery = assignDelivery;
const updateDeliveryStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { deliveryId } = req.params;
    const { status } = req.body;
    try {
        const delivery = yield Delivery_1.default.findById(deliveryId);
        if (!delivery)
            return res.status(404).json({ message: "Delivery not found" });
        delivery.status = status;
        if (status === "picked_up")
            delivery.pickedUpAt = new Date();
        if (status === "delivered")
            delivery.deliveredAt = new Date();
        yield delivery.save();
        res.json(delivery);
    }
    catch (error) {
        res.status(500).json({ message: "Error updating delivery status", error });
    }
});
exports.updateDeliveryStatus = updateDeliveryStatus;
// ------------------- SUBSCRIPTION MANAGEMENT -------------------
const toggleSubscriptionStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { subscriptionId } = req.params;
    const { action } = req.body; // "pause" | "resume"
    try {
        const subscription = yield Subscription_1.default.findById(subscriptionId);
        if (!subscription)
            return res.status(404).json({ message: "Subscription not found" });
        subscription.isPaused = action === "pause";
        yield subscription.save();
        res.json({ subscription, message: `Subscription ${action}d successfully` });
    }
    catch (error) {
        res.status(500).json({ message: "Error updating subscription", error });
    }
});
exports.toggleSubscriptionStatus = toggleSubscriptionStatus;
// ------------------- LOCK MEALS AFTER CHANGE WINDOW -------------------
const lockMealsAfterChangeWindow = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subscriptions = yield Subscription_1.default.find();
        for (const sub of subscriptions) {
            const lockDate = new Date(sub.startDate);
            lockDate.setDate(lockDate.getDate() + 3);
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
const getRevenueReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const subscriptions = yield Subscription_1.default.find().populate("userId").lean();
        const allDailyOrders = yield DailyOrder_1.DailyOrder.find()
            .populate("userId")
            .populate("subscriptionId")
            .populate("meals.productId")
            .lean();
        const deliveryPartners = yield DeliveryPartner_1.default.find().lean();
        const deliveries = yield Delivery_2.default.find().lean();
        let totalRevenue = 0;
        const detailedRevenue = [];
        // --- Subscription analytics ---
        for (const sub of subscriptions) {
            const user = sub.userId || {};
            const dailyOrders = allDailyOrders.filter((order) => { var _a, _b; return ((_b = (_a = order.subscriptionId) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()) === sub._id.toString(); });
            let subscriptionTotal = 0;
            const ordersDetails = dailyOrders.map((order) => {
                let orderTotal = 0;
                const mealsDetails = order.meals.map((meal) => {
                    const product = meal.productId || {};
                    const price = product.price || 0;
                    orderTotal += price;
                    return {
                        productId: product._id,
                        name: product.name,
                        mealType: product.mealType,
                        price,
                        quantity: meal.quantity || 1,
                        status: meal.status,
                    };
                });
                subscriptionTotal += orderTotal;
                return {
                    orderId: order._id,
                    date: order.date,
                    total: orderTotal,
                    meals: mealsDetails,
                };
            });
            totalRevenue += subscriptionTotal;
            detailedRevenue.push({
                subscriptionId: sub._id.toString(), // convert ObjectId to string
                user: {
                    userId: ((_a = user._id) === null || _a === void 0 ? void 0 : _a.toString()) || ((_b = sub.userId) === null || _b === void 0 ? void 0 : _b.toString()),
                    name: user.name || "N/A",
                    email: user.email || "N/A"
                },
                subscriptionDetails: {
                    plan: sub.planType,
                    startDate: ((_c = sub.startDate) === null || _c === void 0 ? void 0 : _c.toISOString()) || "", // convert Date to string
                    endDate: ((_d = sub.endDate) === null || _d === void 0 ? void 0 : _d.toISOString()) || "" // convert Date to string
                },
                subscriptionTotal,
                orders: ordersDetails,
            });
        }
        // --- User analytics ---
        const userAnalytics = subscriptions.map((sub) => {
            var _a, _b, _c;
            const userOrders = allDailyOrders.filter((order) => { var _a, _b, _c, _d; return ((_b = (_a = order.userId) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()) === ((_d = (_c = sub.userId) === null || _c === void 0 ? void 0 : _c._id) === null || _d === void 0 ? void 0 : _d.toString()); });
            const totalSpent = userOrders.reduce((sum, order) => {
                var _a;
                return sum +
                    (((_a = order.meals) === null || _a === void 0 ? void 0 : _a.reduce((s, meal) => s + ((meal.costPrice || 0) * (meal.quantity || 1)), 0)) || 0);
            }, 0);
            return {
                userId: (_a = sub.userId) === null || _a === void 0 ? void 0 : _a._id,
                username: (_b = sub.userId) === null || _b === void 0 ? void 0 : _b.name,
                email: (_c = sub.userId) === null || _c === void 0 ? void 0 : _c.email,
                totalOrders: userOrders.length,
                totalSpent,
            };
        });
        const deliveryPartnerAnalytics = deliveryPartners.map((partner) => {
            // Get all deliveries assigned to this partner
            const partnerDeliveries = deliveries.filter((delivery) => { var _a; return ((_a = delivery.driverId) === null || _a === void 0 ? void 0 : _a.toString()) === partner._id.toString(); });
            // Initialize counters
            let totalDeliveries = 0;
            let deliveredOrders = 0;
            let delayedDeliveries = 0;
            let cancelledOrders = 0;
            partnerDeliveries.forEach((delivery) => {
                var _a, _b, _c;
                // Find the linked DailyOrder
                const order = allDailyOrders.find((o) => o._id.toString() === delivery.orderId.toString());
                if (!order)
                    return;
                const allMealsDelivered = (_b = (_a = order.meals) === null || _a === void 0 ? void 0 : _a.every((m) => m.status === "delivered")) !== null && _b !== void 0 ? _b : false;
                // Count delivered orders: orderStatus="delivered" && paymentStatus="paid" && all meals delivered
                if (order.orderStatus === "delivered" && order.paymentStatus === "paid" && allMealsDelivered) {
                    deliveredOrders++;
                }
                // Count delayed deliveries: any meal delayed OR orderStatus="delayed"
                if (order.orderStatus === "delayed" || ((_c = order.meals) === null || _c === void 0 ? void 0 : _c.some((m) => m.status === "delayed"))) {
                    delayedDeliveries++;
                }
                // Count cancelled orders
                if (order.orderStatus === "cancelled") {
                    cancelledOrders++;
                }
                totalDeliveries++; // total assigned deliveries
            });
            return {
                partnerId: partner._id,
                name: partner.name,
                totalDeliveries,
                deliveredOrders,
                delayedDeliveries,
                cancelledOrders,
            };
        });
        // --- Delivery delay details ---
        const delayedOrders = allDailyOrders.filter((order) => { var _a; return (_a = order.meals) === null || _a === void 0 ? void 0 : _a.some((m) => m.status === "delayed"); });
        const delayDetails = delayedOrders.map((order) => {
            var _a;
            const user = order.userId || {};
            const delayedMeals = order.meals
                .filter((m) => m.status === "delayed")
                .map((m) => {
                const product = m.productId || {};
                const expected = new Date(m.expectedDeliveryTime);
                const actual = new Date(m.actualDeliveryTime);
                const delayMinutes = Math.max(0, (actual.getTime() - expected.getTime()) / (1000 * 60));
                return {
                    productId: product._id,
                    productName: product.name,
                    mealType: product.mealType,
                    expectedDeliveryTime: expected,
                    actualDeliveryTime: actual,
                    delayMinutes,
                };
            });
            return {
                orderId: order._id,
                user: { userId: user._id, name: user.name || "N/A", email: user.email || "N/A" },
                subscriptionId: (_a = order.subscriptionId) === null || _a === void 0 ? void 0 : _a._id,
                date: order.date,
                delayedMeals,
            };
        });
        const totalDelayMinutes = delayDetails.reduce((sum, order) => sum + order.delayedMeals.reduce((s, m) => s + m.delayMinutes, 0), 0);
        const delayedMealCount = delayDetails.reduce((count, order) => count + order.delayedMeals.length, 0);
        const averageDelayMinutes = delayedMealCount ? totalDelayMinutes / delayedMealCount : 0;
        // --- RESPONSE ---
        res.json({
            totalRevenue,
            totalSubscriptions: subscriptions.length,
            totalDelayedOrders: delayedOrders.length,
            averageDelayMinutes: parseFloat(averageDelayMinutes.toFixed(2)),
            subscriptions: detailedRevenue,
            userAnalytics,
            deliveryPartnerAnalytics,
            deliveryDelays: delayDetails,
        });
    }
    catch (error) {
        console.error("Error generating detailed revenue report:", error);
        res.status(500).json({ message: "Error generating detailed revenue report", error });
    }
});
exports.getRevenueReport = getRevenueReport;
// ------------------- DELIVERY DELAY REPORT -------------------
const getDeliveryDelayReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1️⃣ Fetch delayed orders from DailyOrder
        const delayedOrders = yield DailyOrder_1.DailyOrder.find({
            $or: [
                { orderStatus: "delayed" },
                { paymentStatus: "delayed" },
                { "meals.status": "delayed" },
            ],
        })
            .populate("userId")
            .populate("subscriptionId")
            .populate("meals.productId")
            .lean();
        // 2️⃣ Fetch deliveries linked to these orders that are delayed
        const orderIds = delayedOrders.map((o) => o._id);
        const delayedDeliveries = yield Delivery_2.default.find({
            orderId: { $in: orderIds },
            deliveryStatus: "delayed",
        })
            .populate("driverId") // delivery partner info
            .lean();
        // 3️⃣ Combine data per order if needed
        const report = delayedOrders.map((order) => {
            const deliveries = delayedDeliveries.filter((d) => d.orderId.toString() === order._id.toString());
            return Object.assign(Object.assign({}, order), { delayedDeliveries: deliveries, delayedDeliveryCount: deliveries.length });
        });
        res.json({
            delayedOrders: report,
            count: report.length,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching delivery delays", error });
    }
});
exports.getDeliveryDelayReport = getDeliveryDelayReport;
// ------------------- REFUND / ISSUE RESOLUTION -------------------
const processRefund = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { subscriptionId, reason } = req.body;
    try {
        const subscription = yield Subscription_1.default.findById(subscriptionId);
        if (!subscription)
            return res.status(404).json({ message: "Subscription not found" });
        subscription.status = "refunded";
        subscription.refundReason = reason;
        yield subscription.save();
        res.json({ subscription, message: "Refund processed successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Error processing refund", error });
    }
});
exports.processRefund = processRefund;
