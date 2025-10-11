"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const SubscriptionPlanSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    durationDays: { type: Number, required: true },
    mealsPerDay: { type: Number, enum: [2, 3], required: true },
    basePrice: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    changeWindowDays: { type: Number, default: 3 },
    autoRenewalAllowed: { type: Boolean, default: true }
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("SubscriptionPlan", SubscriptionPlanSchema);
