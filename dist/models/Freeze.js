"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const FreezeSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
    freezeDate: { type: Date, required: true },
    selectedDate: { type: Date, default: Date.now },
    meals: {
        breakfast: { type: Boolean, default: false },
        lunch: { type: Boolean, default: false },
        dinner: { type: Boolean, default: false },
    },
    status: { type: String, enum: ['active', 'inactive', 'cancelled'], default: 'active' },
    deliveryStatus: { type: String },
    totalMealsConsumption: { type: Number, default: 0 },
    subscriptionMealsConsumption: { type: Number, default: 0 }
}, { timestamps: true });
const Freeze = (0, mongoose_1.model)('Freeze', FreezeSchema);
exports.default = Freeze;
