"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const OrderSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
        {
            product: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product", required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
            restaurant: { type: mongoose_1.Schema.Types.ObjectId, ref: "Restaurant" },
            program: { type: mongoose_1.Schema.Types.ObjectId, ref: "Program" },
        },
    ],
    totalPrice: { type: Number, required: true },
    status: {
        type: String,
        enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
        default: "pending",
    },
    paymentMethod: {
        type: String,
        enum: ["card", "upi", "cod", "wallet"],
        required: true,
    },
    shippingAddress: { type: String },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Order", OrderSchema);
