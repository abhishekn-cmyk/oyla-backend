"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductModel = void 0;
const mongoose_1 = require("mongoose");
const ProductSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    tagline: { type: String },
    description: { type: String },
    price: { type: Number, required: true },
    image: { type: String },
    rating: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    features: [{ type: String }],
    nutrition: {
        fat: { type: String },
        carbohydrate: { type: String },
        protein: { type: String },
        calories: { type: String },
    },
    ingredients: [{ type: String }],
    mealType: {
        type: String,
        enum: [
            "veg",
            "non-veg",
            "vegan",
            "breakfast",
            "lunch",
            "dinner",
            "snack",
            "soup",
            "salad",
            "biriyani",
            "main-meal"
        ],
    },
    availableDates: [{ type: Date }], // For scheduling products per date
    category: {
        type: String,
        enum: ["main", "breakfast", "snack", "salad", "dessert", "beverage"],
    },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Product", ProductSchema);
exports.ProductModel = ProductSchema;
