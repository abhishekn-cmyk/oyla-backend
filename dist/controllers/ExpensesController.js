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
exports.deleteCategoryMaster = exports.updateCategoryMaster = exports.getCategoryMasterById = exports.getCategoryMasters = exports.addCategoryMaster = exports.getUserMealPlan = exports.deliverTodayMeals = exports.updateMealStatus = exports.getExpenses = exports.getSubscriptionRevenueReport = exports.markRefundEligible = exports.getDeliveryStats = exports.assignDeliveryPartner = exports.autoRenewSubscriptions = exports.getProfitLossReport = exports.allocateExpenseToProduct = exports.addExpense = void 0;
const Expenses_1 = require("../models/Expenses");
const Product_1 = require("../models/Product");
const Subscription_1 = __importDefault(require("../models/Subscription"));
const Category_1 = require("../models/Category");
// Add Expense
const addExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const attachments = ((_a = req.files) === null || _a === void 0 ? void 0 : _a.map(f => f.path)) || [];
        const { item, quantity, amount, category, referenceNumber } = req.body;
        if (!item || !amount || !category)
            return res.status(400).json({ success: false, message: "Item, amount, category required" });
        // ✅ Validate category exists in CategoryMaster
        const catExists = yield Category_1.CategoryMaster.findOne({ name: category });
        if (!catExists)
            return res.status(400).json({ success: false, message: "Category does not exist" });
        const expense = yield Expenses_1.Expense.create({ item, quantity, amount, category, referenceNumber, attachments });
        res.status(201).json({ success: true, expense });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.addExpense = addExpense;
// Allocate Expense to Product
const allocateExpenseToProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, expenseAmount } = req.body;
        // ✅ Validate input
        if (!productId || expenseAmount === undefined) {
            return res.status(400).json({
                success: false,
                message: "productId and expenseAmount are required",
            });
        }
        // ✅ Find product
        const product = yield Product_1.ProductModel.findById(productId);
        if (!product)
            return res.status(404).json({ success: false, message: "Product not found" });
        // ✅ Ensure numeric addition
        const expenseValue = Number(expenseAmount);
        if (isNaN(expenseValue))
            return res.status(400).json({ success: false, message: "Invalid expenseAmount" });
        // ✅ Safely increment
        product.totalExpense = (product.totalExpense || 0) + expenseValue;
        yield product.save();
        res.status(200).json({
            success: true,
            message: "Expense successfully allocated to product",
            product,
        });
    }
    catch (err) {
        console.error("Error allocating expense:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.allocateExpenseToProduct = allocateExpenseToProduct;
// Profit & Loss Report
const getProfitLossReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield Product_1.ProductModel.find({});
        const subscriptions = yield Subscription_1.default.find({}).populate("meals.breakfast meals.lunch meals.dinner");
        const productReports = products.map(product => {
            const totalCost = product.totalExpense || 0;
            let totalRevenue = 0;
            subscriptions.forEach(sub => {
                if (!sub.totalMeals || sub.totalMeals === 0)
                    return;
                const revenuePerMeal = sub.price / sub.totalMeals;
                sub.meals.forEach(meal => {
                    // Collect all possible meal items (breakfast, lunch, dinner)
                    const allMeals = [meal.breakfast, meal.lunch, meal.dinner].filter(Boolean);
                    allMeals.forEach(mealItem => {
                        var _a;
                        if (((_a = mealItem === null || mealItem === void 0 ? void 0 : mealItem._id) === null || _a === void 0 ? void 0 : _a.toString()) === product.id.toString()) {
                            totalRevenue += revenuePerMeal;
                        }
                    });
                });
            });
            const profitOrLoss = totalRevenue - totalCost;
            return {
                productId: product._id,
                name: product.name,
                totalCost,
                totalRevenue,
                profit: profitOrLoss > 0 ? profitOrLoss : 0,
                loss: profitOrLoss < 0 ? Math.abs(profitOrLoss) : 0,
            };
        });
        // Also compute grand totals if you want an overall summary
        const totals = productReports.reduce((acc, p) => {
            acc.totalCost += p.totalCost;
            acc.totalRevenue += p.totalRevenue;
            acc.totalProfit += p.profit;
            acc.totalLoss += p.loss;
            return acc;
        }, { totalCost: 0, totalRevenue: 0, totalProfit: 0, totalLoss: 0 });
        res.status(200).json({ products: productReports, totals });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.getProfitLossReport = getProfitLossReport;
// Auto-Renew Subscriptions
const autoRenewSubscriptions = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const today = new Date();
        const expiringSubs = yield Subscription_1.default.find({
            endDate: { $lte: today },
            autoRenew: true,
            status: "active"
        });
        for (const sub of expiringSubs) {
            const newStart = new Date();
            const newEnd = new Date();
            newEnd.setDate(newStart.getDate() + sub.durationDays);
            const data = sub.toObject();
            delete data._id;
            const renewedSub = new Subscription_1.default(Object.assign(Object.assign({}, data), { startDate: newStart, endDate: newEnd, status: "active", deliveredMeals: 0, pendingDeliveries: sub.totalMeals, consumedMeals: 0, remainingMeals: sub.totalMeals, price: sub.price - (sub.discountAmount || 0) }));
            yield renewedSub.save();
        }
    }
    catch (err) {
        console.error("Auto-renew error:", err);
    }
});
exports.autoRenewSubscriptions = autoRenewSubscriptions;
// Assign Delivery Partner
const assignDeliveryPartner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subscriptionId, partnerId } = req.body;
        const sub = yield Subscription_1.default.findById(subscriptionId);
        if (!sub)
            return res.status(404).json({ message: "Subscription not found" });
        sub.deliveryAddress = Object.assign(Object.assign({}, sub.deliveryAddress), { partnerId });
        yield sub.save();
        res.status(200).json({ success: true, subscription: sub });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.assignDeliveryPartner = assignDeliveryPartner;
// Delivery Stats
const getDeliveryStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield Subscription_1.default.aggregate([
            { $match: { status: "active" } },
            { $group: {
                    _id: "$deliveryAddress.partnerId",
                    totalSubscriptions: { $sum: 1 },
                    totalDelivered: { $sum: "$deliveredMeals" },
                    totalPending: { $sum: "$pendingDeliveries" }
                }
            }
        ]);
        res.status(200).json({ stats });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.getDeliveryStats = getDeliveryStats;
// Mark Refund Eligible
const markRefundEligible = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subscriptionId, eligible } = req.body;
        const sub = yield Subscription_1.default.findById(subscriptionId);
        if (!sub)
            return res.status(404).json({ message: "Subscription not found" });
        sub.cancellationStatus = eligible ? "pending" : sub.cancellationStatus;
        yield sub.save();
        res.status(200).json({ success: true, subscription: sub });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.markRefundEligible = markRefundEligible;
// Subscription Revenue Report
const getSubscriptionRevenueReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subscriptions = yield Subscription_1.default.find({});
        const totalRevenue = subscriptions.reduce((acc, sub) => acc + (sub.price || 0), 0);
        const totalSubscriptions = subscriptions.length;
        res.status(200).json({ totalRevenue, totalSubscriptions });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.getSubscriptionRevenueReport = getSubscriptionRevenueReport;
// GET /expense
const getExpenses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const expenses = yield Expenses_1.Expense.find().sort({ createdAt: -1 });
        res.status(200).json(expenses);
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.getExpenses = getExpenses;
// ---------------- Update Meal Status ----------------
const updateMealStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subscriptionId, date, status } = req.body;
        const sub = yield Subscription_1.default.findById(subscriptionId);
        if (!sub)
            return res.status(404).json({ message: "Subscription not found" });
        const targetDate = new Date(date);
        const meal = sub.meals.find(m => new Date(m.date).toDateString() === targetDate.toDateString());
        if (!meal)
            return res.status(404).json({ message: "Meal not found" });
        if (status === "delivered" && meal.status !== "delivered") {
            sub.deliveredMeals++;
            sub.pendingDeliveries = Math.max(sub.pendingDeliveries - 1, 0);
        }
        meal.status = status;
        yield sub.save();
        res.status(200).json({ success: true, subscription: sub });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.updateMealStatus = updateMealStatus;
// ---------------- Deliver Today's Meals ----------------
const deliverTodayMeals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subscriptionId } = req.params;
        const sub = yield Subscription_1.default.findById(subscriptionId);
        if (!sub)
            return res.status(404).json({ message: "Subscription not found" });
        const todayStr = new Date().toISOString().split("T")[0];
        const meal = sub.meals.find(m => new Date(m.date).toISOString().split("T")[0] === todayStr);
        if (!meal)
            return res.status(404).json({ message: "No meal scheduled for today" });
        if (meal.status !== "delivered") {
            meal.status = "delivered";
            sub.deliveredMeals += 1;
            sub.pendingDeliveries = Math.max(sub.pendingDeliveries - 1, 0);
            sub.lastDeliveredAt = new Date();
            yield sub.save();
        }
        res.status(200).json({ success: true, subscription: sub });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.deliverTodayMeals = deliverTodayMeals;
// ---------------- Get User Meal Plan ----------------
const getUserMealPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const sub = yield Subscription_1.default.findOne({ userId, status: "active" }).populate("meals.breakfast meals.lunch meals.dinner");
        if (!sub)
            return res.status(404).json({ message: "Active subscription not found for this user" });
        const today = new Date();
        const mealsPlan = sub.meals
            .filter(m => new Date(m.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(m => ({
            date: m.date.toISOString().split("T")[0],
            breakfast: m.breakfast ? { id: m.breakfast._id, name: m.breakfast.name } : null,
            lunch: m.lunch ? { id: m.lunch._id, name: m.lunch.name } : null,
            dinner: m.dinner ? { id: m.dinner._id, name: m.dinner.name } : null,
            status: m.status,
        }));
        res.status(200).json({ subscriptionId: sub._id, mealsPlan });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.getUserMealPlan = getUserMealPlan;
// Add a new category
const addCategoryMaster = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, type, description } = req.body;
        const category = new Category_1.CategoryMaster({ name, type, description });
        yield category.save();
        res.status(201).json({ success: true, data: category });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});
exports.addCategoryMaster = addCategoryMaster;
// Get all categories, optional filter by type
const getCategoryMasters = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filter = {};
        if (req.query.type)
            filter.type = req.query.type;
        const categories = yield Category_1.CategoryMaster.find(filter);
        res.status(200).json({ success: true, data: categories });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.getCategoryMasters = getCategoryMasters;
// Get category by ID
const getCategoryMasterById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const category = yield Category_1.CategoryMaster.findById(req.params.id);
        if (!category)
            return res.status(404).json({ success: false, message: "Category not found" });
        res.status(200).json({ success: true, data: category });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.getCategoryMasterById = getCategoryMasterById;
// Update category
const updateCategoryMaster = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, type, description, isActive } = req.body;
        const category = yield Category_1.CategoryMaster.findByIdAndUpdate(req.params.id, { name, type, description, isActive }, { new: true, runValidators: true });
        if (!category)
            return res.status(404).json({ success: false, message: "Category not found" });
        // ✅ Update existing expenses that had the old category name
        yield Expenses_1.Expense.updateMany({ category: category.name }, // old category name
        { category: name } // new category name
        );
        res.status(200).json({ success: true, data: category });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});
exports.updateCategoryMaster = updateCategoryMaster;
// Delete category
const deleteCategoryMaster = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const category = yield Category_1.CategoryMaster.findByIdAndDelete(req.params.id);
        if (!category)
            return res.status(404).json({ success: false, message: "Category not found" });
        res.status(200).json({ success: true, message: "Category deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.deleteCategoryMaster = deleteCategoryMaster;
