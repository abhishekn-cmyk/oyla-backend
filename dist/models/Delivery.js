"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const DeliverySchema = new mongoose_1.Schema({
    orderId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Order", required: true },
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: "DeliveryPartner" },
    deliveryPartnerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "DeliveryPartner" }, // new field
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    restaurantId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Restaurant" },
    deliveryAddress: { type: String },
    deliveryStatus: {
        type: String,
        enum: [
            "pending",
            "assigned",
            "dispatched",
            "picked_up", // new status
            "delivered",
            "cancelled",
            "failed",
        ],
        default: "pending",
    },
    assignedAt: { type: Date },
    pickedUpAt: { type: Date }, // new timestamp
    deliveredAt: { type: Date },
    otpCode: { type: String },
    distanceKm: { type: Number },
    status: { type: String },
    deliveryFee: { type: Number, default: 0 },
    notes: { type: String },
    deliveredProducts: [
        {
            productId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product" },
            name: String,
            quantity: Number,
            price: Number,
            costPrice: Number,
            status: String,
        }
    ],
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Delivery", DeliverySchema);
