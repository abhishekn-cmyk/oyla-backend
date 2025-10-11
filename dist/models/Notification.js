"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const NotificationSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ["system", "order", "delivery", "promotional", "alert", "cart"],
        required: true
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium"
    },
    targetAudience: {
        type: String,
        enum: ["all", "customers", "delivery_partners", "admins", "specific_users", "user"],
    },
    specificUsers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    scheduledFor: { type: Date },
    sentAt: { type: Date },
    createdAt: { type: Date },
    status: {
        type: String,
        enum: ["draft", "scheduled", "sent", "failed"],
        default: "draft"
    },
    channels: {
        push: { type: Boolean, default: false },
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true }
    },
    metadata: {
        orderId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Order" },
        subscriptionId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Subscription" },
        deliveryId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Delivery" },
        deepLink: { type: String }
    },
    stats: {
        totalSent: { type: Number, default: 0 },
        delivered: { type: Number, default: 0 },
        opened: { type: Number, default: 0 },
        clicked: { type: Number, default: 0 }
    },
    createdBy: { type: String, ref: "User" }
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Notification", NotificationSchema);
