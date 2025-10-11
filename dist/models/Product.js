"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductModel = void 0;
const mongoose_1 = require("mongoose");
const ProductSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    tagline: { type: String },
    taglines: [{ type: String }],
    description: { type: String },
    price: { type: Number, default: 0 }, // selling price
    basePrice: { type: Number, default: 0 }, // base price
    costPrice: { type: Number, default: 0 }, // purchase/prep cost
    image: { type: String },
    rating: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    features: [{ type: String }],
    calories: { type: Number },
    nutrition: {
        fat: { type: String },
        carbohydrate: { type: String },
        protein: { type: String },
        calories: { type: String }
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
        ]
    },
    type: {
        type: String,
        enum: ["veg", "non-veg", "vegan", "keto", "diabetic", "high-protein", "diet",
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
            "meditation",]
    },
    availableDates: [{ type: Date }],
    availableDays: { type: String },
    category: {
        type: String,
        enum: [
            "main", "breakfast", "lunch", "snack", "salad", "dessert", "beverage", "dinner",
            "veg", "non-veg", "vegan", "keto", "diabetic", "high-protein",
            "diet", "bodybuilding", "yoga", "wellness", "vegan diet", "healthy food",
            "keto diet", "intermittent fasting", "weight loss", "strength training",
            "cardio", "pilates", "meditation"
        ],
    },
    isActive: { type: Boolean, default: true },
    totalExpense: { type: Number, default: 0 },
}, { timestamps: true });
exports.ProductModel = (0, mongoose_1.model)("Product", ProductSchema);
exports.default = exports.ProductModel;
