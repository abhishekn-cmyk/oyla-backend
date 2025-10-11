"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const SuperAdminSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    profileImage: { type: String },
    phoneNumber: { type: String },
    role: { type: String, enum: ["superadmin"], default: "superadmin" },
    permissions: [{ type: String }],
    lastLogin: { type: Date },
    isActive: { type: Boolean, default: true },
    // Policies fields
    terms: { type: String, default: "" },
    privacyPolicy: { type: String, default: "" },
    renewalRules: { type: String, default: "" },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("SuperAdmin", SuperAdminSchema);
