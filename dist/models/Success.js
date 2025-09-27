"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const SuccessStorySchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String },
    images: [{ type: String }],
    author: { type: String },
    role: { type: String },
    category: { type: String },
    tags: [{ type: String }],
    date: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("SuccessStory", SuccessStorySchema);
