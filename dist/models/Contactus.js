"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const phoneValidator = (phones) => {
    const phoneRegex = /^\+?\d{7,15}$/; // allows optional + and 7-15 digits
    return phones.every(phone => phoneRegex.test(phone));
};
const ContactUsSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumbers: {
        type: [String],
        validate: {
            validator: phoneValidator,
            message: "Phone numbers must be valid and contain only digits (optional + for country code)"
        }
    },
    address: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
}, { timestamps: true });
const ContactUs = (0, mongoose_1.model)("ContactUs", ContactUsSchema);
exports.default = ContactUs;
