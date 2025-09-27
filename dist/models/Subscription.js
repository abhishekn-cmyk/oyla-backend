"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const SubscriptionSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    planType: { type: String, enum: ["basic", "premium", "pro"], required: true },
    planName: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    durationDays: { type: Number },
    status: {
        type: String,
        enum: ["active", "cancelled", "expired", "paused", "pending", "freeze", "delivered", "swappable"],
        default: "active",
    },
    autoRenew: { type: Boolean, default: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    billingCycle: { type: String, enum: ["monthly", "quarterly", "yearly"], required: true },
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
    // cancellation
    cancellationDate: Date,
    cancellationReason: String,
    cancellationStatus: { type: String, enum: ["pending", "processed", "refunded"] },
    refundAmount: { type: Number, default: 0 },
    penaltyAmount: { type: Number, default: 0 },
    completedDays: { type: Number, default: 0 },
    pendingDays: { type: Number, default: 0 },
    deliveryAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: String,
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
    },
    payment: {
        gateway: { type: String, required: true },
        transactionId: String,
        status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
        amountPaid: { type: Number, default: 0 },
        currency: { type: String, default: "INR" },
        paymentDate: Date,
    },
    discountCode: String,
    discountAmount: { type: Number, default: 0 },
    externalPoints: { type: Number, default: 0 },
    uniqueCode: String,
}, { timestamps: true });
// auto calc
SubscriptionSchema.pre("save", function (next) {
    if (this.startDate && this.endDate) {
        const diff = this.endDate.getTime() - this.startDate.getTime();
        this.durationDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    this.remainingMeals = this.totalMeals - this.consumedMeals;
    this.pendingDeliveries = Math.max(this.remainingMeals - this.swappableMeals, 0);
    if (this.endDate && this.endDate < new Date() && this.status === "active") {
        this.status = "expired";
    }
    next();
});
const Subscription = (0, mongoose_1.model)("Subscription", SubscriptionSchema);
exports.default = Subscription;
