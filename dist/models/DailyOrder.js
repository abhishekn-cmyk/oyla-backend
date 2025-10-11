"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyOrder = void 0;
const mongoose_1 = require("mongoose");
const DailyOrderSchema = new mongoose_1.Schema({
    subscriptionId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Subscription", required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    meals: [
        {
            slot: { type: String, enum: ["breakfast", "lunch", "dinner"], required: true },
            productId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product", required: true },
            status: {
                type: String,
                enum: ["scheduled", "prepared", "preparing", "partially_refunded", "confirmed", "partially_delivered", "cancelled", "out_for_delivery", "dispatched", "delivered", "delayed", "pending"],
                default: "scheduled",
            },
            statusHistory: [
                {
                    status: { type: String, enum: ["scheduled", "prepared", "preparing", "partially_refunded", "confirmed", "partially_delivered", "cancelled", "out_for_delivery", "dispatched", "delivered", "delayed", "pending"] },
                    updatedAt: { type: Date, default: Date.now },
                },
            ],
            locked: { type: Boolean, default: false },
            price: { type: Number, default: 0 },
            costPrice: { type: Number, default: 0 },
            quantity: { type: Number, default: 1 },
            delayMinutes: { type: String },
            expectedDeliveryTime: { type: String },
        },
    ],
    delayDuration: { type: String },
    deliveryPartner: { type: mongoose_1.Schema.Types.ObjectId, ref: "DeliveryPartner" },
    deliveryZone: { type: String },
    totalPrice: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    orderStatus: {
        type: String,
        enum: [
            "pending",
            "confirmed",
            "preparing",
            "prepared", // ✅ add this
            "out_for_delivery",
            "dispatched",
            "delivered",
            "cancelled",
            "partially_delivered",
            "delayed",
            "partially_refunded",
        ],
        default: "pending",
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded", "partial_refund", "dispatched"],
        default: "pending",
    },
    paymentMethod: {
        type: String,
        enum: ["card", "cash", "wallet", "stripe", "cod"],
    },
    currency: { type: String, default: "KWD" },
    updatedAt: { type: String },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
// Virtuals
DailyOrderSchema.virtual("subscription", {
    ref: "Subscription",
    localField: "subscriptionId",
    foreignField: "_id",
    justOne: true,
});
DailyOrderSchema.virtual("user", {
    ref: "User",
    localField: "userId",
    foreignField: "_id",
    justOne: true,
});
DailyOrderSchema.virtual("deliveryPartnerInfo", {
    ref: "DeliveryPartner",
    localField: "deliveryPartner",
    foreignField: "_id",
    justOne: true,
});
// Indexes
DailyOrderSchema.index({ userId: 1, date: 1 });
DailyOrderSchema.index({ subscriptionId: 1 });
DailyOrderSchema.index({ "meals.status": 1 });
DailyOrderSchema.index({ orderStatus: 1 });
DailyOrderSchema.index({ date: 1 });
// ------------------ Pre-save middleware ------------------
DailyOrderSchema.pre("save", function (next) {
    if (this.meals && this.meals.length > 0) {
        // Calculate totals
        this.totalPrice = this.meals.reduce((sum, meal) => sum + (meal.price || 0) * (meal.quantity || 1), 0);
        this.totalCost = this.meals.reduce((sum, meal) => sum + (meal.costPrice || 0) * (meal.quantity || 1), 0);
        this.profit = this.totalPrice - this.totalCost;
        // Determine order status
        const totalMeals = this.meals.length;
        const deliveredMeals = this.meals.filter((m) => m.status === "delivered").length;
        const delayedMeals = this.meals.filter((m) => m.status === "delayed").length;
        if (deliveredMeals === totalMeals)
            this.orderStatus = "delivered";
        else if (delayedMeals === totalMeals)
            this.orderStatus = "delayed";
        else if (deliveredMeals > 0 && delayedMeals > 0)
            this.orderStatus = "partially_delivered";
        else if (this.meals.some((m) => m.status === "dispatched"))
            this.orderStatus = "out_for_delivery";
        else if (this.meals.some((m) => m.status === "prepared"))
            this.orderStatus = "preparing";
        else
            this.orderStatus = "confirmed";
    }
    next();
});
// ------------------ Instance Methods ------------------
// Pre-save middleware
DailyOrderSchema.pre("save", function (next) {
    if (this.meals && this.meals.length > 0) {
        // Calculate totals
        this.totalPrice = this.meals.reduce((sum, meal) => sum + (meal.price || 0) * (meal.quantity || 1), 0);
        this.totalCost = this.meals.reduce((sum, meal) => sum + (meal.costPrice || 0) * (meal.quantity || 1), 0);
        this.profit = this.totalPrice - this.totalCost;
        // Determine order status
        const totalMeals = this.meals.length;
        const deliveredMeals = this.meals.filter((m) => m.status === "delivered").length;
        const delayedMeals = this.meals.filter((m) => m.status === "delayed").length;
        if (deliveredMeals === totalMeals)
            this.orderStatus = "delivered";
        else if (delayedMeals === totalMeals)
            this.orderStatus = "delayed";
        else if (deliveredMeals > 0 && delayedMeals > 0)
            this.orderStatus = "partially_delivered";
        else if (this.meals.some((m) => m.status === "dispatched"))
            this.orderStatus = "out_for_delivery";
        else if (this.meals.some((m) => m.status === "prepared"))
            this.orderStatus = "preparing";
        else
            this.orderStatus = "confirmed";
    }
    next();
});
// Revenue by status
DailyOrderSchema.methods.getRevenueByStatus = function () {
    const revenueByStatus = {
        scheduled: 0,
        prepared: 0,
        dispatched: 0,
        delivered: 0,
        delayed: 0,
    };
    this.meals.forEach((meal) => {
        const mealRevenue = (meal.price || 0) * (meal.quantity || 1);
        revenueByStatus[meal.status] += mealRevenue;
    });
    return revenueByStatus;
};
exports.DailyOrder = (0, mongoose_1.model)("DailyOrder", DailyOrderSchema);
