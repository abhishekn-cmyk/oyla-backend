"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const DeliveryPartnerSchema = new mongoose_1.Schema({
    adminId: { type: mongoose_1.Schema.Types.ObjectId, ref: "SuperAdmin", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String },
    vehicleType: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    assignedZones: [{ type: String }],
    isActive: { type: Boolean, default: true },
    currentStatus: { type: String, enum: ["available", "busy", "offline"], default: "offline" },
    totalDeliveries: { type: Number, default: 0 },
    delayedDeliveries: { type: Number, default: 0 },
    completedDeliveries: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    earnings: {
        total: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        paid: { type: Number, default: 0 },
    },
    location: {
        latitude: { type: Number },
        longitude: { type: Number },
        lastUpdated: { type: Date },
    },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("DeliveryPartner", DeliveryPartnerSchema);
