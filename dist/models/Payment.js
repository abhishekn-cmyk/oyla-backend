"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const PaymentSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    subscriptionId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Subscription" },
    orderId: { type: String, ref: "Order" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "KWD" },
    gateway: { type: String },
    status: { type: String, enum: ["pending", "completed", "failed", "refunded", "active", "inactive"], default: "pending" },
    transactionId: { type: String },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Payment", PaymentSchema);
