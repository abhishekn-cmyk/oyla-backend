"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Carousel = void 0;
const mongoose_1 = require("mongoose");
// ====================
// Carousel Schema
// ====================
const CarouselSchema = new mongoose_1.Schema({
    title: { type: String },
    subtitle: { type: String },
    image: { type: String, required: true },
    link: { type: String },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
}, { timestamps: true });
// Index to sort slides by order quickly
CarouselSchema.index({ order: 1 });
CarouselSchema.index({ isActive: 1 });
// ====================
// Model
// ====================
const Carousel = (0, mongoose_1.model)("Carousel", CarouselSchema);
exports.Carousel = Carousel;
