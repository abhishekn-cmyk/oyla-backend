"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// Schema definition
const LanguageSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    proficiency: {
        type: String,
        enum: ["Beginner", "Intermediate", "Fluent", "Native"],
        default: "Beginner",
    },
}, {
    timestamps: true, // automatically adds createdAt and updatedAt
});
// Model
const Language = (0, mongoose_1.model)("Language", LanguageSchema);
exports.default = Language;
