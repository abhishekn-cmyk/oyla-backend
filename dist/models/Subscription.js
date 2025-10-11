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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MealSchema = exports.SubscriptionStatus = void 0;
const mongoose_1 = require("mongoose");
// ---------------------- ENUMS ----------------------
exports.SubscriptionStatus = [
    "active",
    "cancelled",
    "expired",
    "paused",
    "pending",
    "freeze",
    "delivered",
    "swappable",
    "completed",
    "resumed",
    "refunded"
];
exports.MealSchema = new mongoose_1.Schema({
    date: { type: Date, required: true },
    breakfast: { type: mongoose_1.Types.ObjectId, ref: "Product", default: null },
    lunch: { type: mongoose_1.Types.ObjectId, ref: "Product", default: null },
    dinner: { type: mongoose_1.Types.ObjectId, ref: "Product", default: null },
    isLocked: { type: Boolean, default: false },
    status: { type: String, default: "pending" },
});
// ---------------------- SCHEMA ----------------------
const SubscriptionSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    planType: { type: String, enum: ["basic", "premium", "pro"], required: true },
    planName: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    durationDays: { type: Number },
    status: { type: String, enum: exports.SubscriptionStatus, default: "active" },
    autoRenew: { type: Boolean, default: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    billingCycle: {
        type: String,
        enum: ["monthly", "quarterly", "yearly", "weekly", "bi-weekly"],
    },
    mealsPerDay: { type: Number, default: 3 },
    totalMeals: { type: Number, required: true },
    consumedMeals: { type: Number, default: 0 },
    remainingMeals: { type: Number, default: 0 },
    // delivery
    deliveredMeals: { type: Number, default: 0 },
    pendingDeliveries: { type: Number, default: 0 },
    // frozen
    frozenDays: { type: Number, default: 0 },
    freezeHistory: [{ startDate: Date, endDate: Date, reason: String }],
    // swappable
    swappableMeals: { type: Number, default: 0 },
    swapHistory: [{ date: Date, fromMeal: String, toMeal: String }],
    meals: [exports.MealSchema],
    isPaused: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    isFrozen: { type: Boolean, default: false },
    refundReason: { type: String },
    // cancellation
    cancellationDate: Date,
    cancellationReason: String,
    cancellationStatus: { type: String, enum: ["pending", "processed", "refunded"] },
    refundAmount: { type: Number, default: 0 },
    penaltyAmount: { type: Number, default: 0 },
    completedDays: { type: Number, default: 0 },
    pendingDays: { type: Number, default: 0 },
    lastDeliveredAt: { type: Date },
    pauseCount: { type: Number },
    // meals calendar
    // delivery address
    deliveryAddress: {
        street: { type: String, },
        city: { type: String, },
        state: { type: String },
        zipCode: { type: String, },
        country: { type: String, },
    },
    payment: {
        gateway: { type: String },
        transactionId: { type: String },
        status: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded", "active", "inactive", "completed"],
            default: "pending",
        },
        balanceRemaining: { type: Number, default: 0 },
        amountPaid: { type: Number, default: 0 },
        currency: { type: String, default: "INR" },
        paymentDate: Date,
        discountApplied: { type: Number, default: 0 } // ✅ Add this line
    },
    // discount / points / unique code
    discountCode: String,
    discountAmount: { type: Number, default: 0 },
    externalPoints: { type: Number, default: 0 },
    uniqueCode: String,
}, { timestamps: true });
// ---------------------- INDEXES ----------------------
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ startDate: 1, endDate: 1 });
SubscriptionSchema.index({ "meals.date": 1 });
// ---------------------- VIRTUALS ----------------------
SubscriptionSchema.virtual("isActive").get(function () {
    return (this.status === "active" &&
        !this.isPaused &&
        !this.isFrozen &&
        new Date() <= this.endDate);
});
SubscriptionSchema.virtual("progress").get(function () {
    return this.totalMeals > 0
        ? Math.round((this.consumedMeals / this.totalMeals) * 100)
        : 0;
});
// ---------------------- METHODS ----------------------
SubscriptionSchema.methods.consumeMeal = function () {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.remainingMeals > 0) {
            this.consumedMeals += 1;
            this.remainingMeals -= 1;
            this.deliveredMeals += 1;
            this.pendingDeliveries = Math.max(this.remainingMeals - this.swappableMeals, 0);
        }
        return this.save();
    });
};
SubscriptionSchema.methods.freeze = function (days, reason) {
    return __awaiter(this, void 0, void 0, function* () {
        const start = new Date();
        const end = new Date();
        end.setDate(start.getDate() + days);
        this.isFrozen = true;
        this.status = "freeze";
        this.frozenDays += days;
        this.freezeHistory.push({ startDate: start, endDate: end, reason });
        return this.save();
    });
};
SubscriptionSchema.methods.swapMeal = function (date, fromMeal, toMeal) {
    return __awaiter(this, void 0, void 0, function* () {
        this.swapHistory.push({ date, fromMeal, toMeal });
        this.swappableMeals = Math.max(this.swappableMeals - 1, 0);
        return this.save();
    });
};
// ---------------------- STATICS ----------------------
SubscriptionSchema.statics.findActiveByUser = function (userId) {
    return this.findOne({
        userId,
        status: "active",
        endDate: { $gte: new Date() },
    });
};
// ---------------------- PRE-SAVE HOOK ----------------------
SubscriptionSchema.pre("save", function (next) {
    if (this.startDate && this.endDate) {
        const diff = this.endDate.getTime() - this.startDate.getTime();
        this.durationDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    this.remainingMeals = this.totalMeals - this.consumedMeals;
    this.pendingDeliveries = Math.max(this.remainingMeals - this.swappableMeals, 0);
    if (this.endDate && this.endDate < new Date()) {
        this.status = "expired";
    }
    if (this.remainingMeals <= 0 && this.status === "active") {
        this.status = "completed";
    }
    next();
});
// ---------------------- EXPORT ----------------------
const Subscription = (0, mongoose_1.model)("Subscription", SubscriptionSchema);
exports.default = Subscription;
