"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const PrivacyPolicySchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    version: { type: String },
    effectiveDate: { type: Date },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("PrivacyPolicy", PrivacyPolicySchema);
