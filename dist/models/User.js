"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    username: { type: String },
    facebookId: { type: String },
    otpCode: { type: String },
    role: { type: String, enum: ["user"], default: "user" },
    isVerified: { type: Boolean, default: false },
    profile: {
        firstName: { type: String },
        lastName: { type: String },
        dob: { type: Date },
        gender: { type: String, enum: ["male", "female", "other"] },
        address: { type: String },
        mobileNumber: { type: String },
        profileImage: { type: String },
        selectedPrograms: [{ type: String, ref: "Program" }],
    },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("User", UserSchema); // Remove <IUser>
