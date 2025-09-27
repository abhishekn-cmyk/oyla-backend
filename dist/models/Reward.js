"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const RewardSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ["percentage", "fixed", "points"], required: true },
    value: { type: Number, required: true },
    code: { type: String, unique: true, sparse: true },
    expiryDate: { type: Date, index: { expireAfterSeconds: 0 } },
    isActive: { type: Boolean, default: true },
    users: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    redeemedUsers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Reward", RewardSchema);
