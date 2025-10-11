"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Expense = void 0;
const mongoose_1 = require("mongoose");
const ExpenseSchema = new mongoose_1.Schema({
    category: { type: String, required: true },
    description: String,
    item: String,
    amount: { type: Number, required: true },
    referenceNo: String,
    attachments: [{ type: String }],
    quantity: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "SuperAdmin" },
}, { timestamps: true });
exports.Expense = (0, mongoose_1.model)("Expense", ExpenseSchema);
