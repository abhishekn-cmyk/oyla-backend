"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const AdminSchema = new mongoose_1.Schema({
    superAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: "SuperAdmin", required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin"], default: "admin" },
    permissions: {
        customerManagement: { type: Boolean, default: false },
        subscriptionManagement: { type: Boolean, default: false },
        mealManagement: { type: Boolean, default: false },
        deliveryManagement: { type: Boolean, default: false },
        reportAccess: { type: Boolean, default: false },
        notificationAccess: { type: Boolean, default: false },
        refundAccess: { type: Boolean, default: false }
    },
    assignedZones: [{ type: String }],
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date }
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Admin", AdminSchema);
