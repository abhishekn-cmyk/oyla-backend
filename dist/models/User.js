"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    facebookId: { type: String },
    otpCode: { type: String },
    username: { type: String, required: true },
    role: {
        type: String,
        enum: ["user", "admin", "superadmin", "delivery_partner"],
        default: "user"
    },
    wallet: { type: mongoose_1.Schema.Types.ObjectId, ref: "Wallet" },
    isVerified: { type: Boolean, default: false },
    profile: {
        firstName: { type: String },
        lastName: { type: String },
        dob: { type: Date },
        gender: { type: String, enum: ["male", "female", "other"] },
        address: { type: String },
        mobileNumber: { type: String },
        profileImage: { type: String },
        selectedPrograms: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Program" }]
    },
    stripeCustomerId: { type: String },
    stripePaymentMethodId: { type: String },
    preferences: {
        mealTypes: [{ type: String }],
        dietaryRestrictions: [{ type: String }],
        deliveryInstructions: { type: String }
    }
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("User", UserSchema);
