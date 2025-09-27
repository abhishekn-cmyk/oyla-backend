"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Program.ts
const mongoose_1 = require("mongoose");
const mongoose_2 = require("mongoose");
const ProgramSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    subtitle: { type: String },
    tagline: { type: String },
    description: { type: String },
    category: {
        type: String,
        enum: [
            "diet",
            "bodybuilding",
            "yoga",
            "wellness",
            "vegan diet",
            "healthy food",
            "keto diet",
            "intermittent fasting",
            "weight loss",
            "strength training",
            "cardio",
            "pilates",
            "meditation",
        ],
        required: true,
    },
    product: [{ type: mongoose_2.Types.ObjectId, ref: "Product" }],
    image: { type: String },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Program", ProgramSchema);
