"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryMaster = void 0;
const mongoose_1 = require("mongoose");
const CategoryMasterSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ["product", "expense", "other"] },
    description: { type: String },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
exports.CategoryMaster = (0, mongoose_1.model)("CategoryMaster", CategoryMasterSchema);
