"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const RestaurantSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    features: [{ type: String }],
    rating: { type: Number, default: 0 },
    address: { type: String },
    location: {
        lat: { type: Number },
        lng: { type: Number },
    },
    menu: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Product" }],
    popularMenu: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Product" }],
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Restaurant", RestaurantSchema);
