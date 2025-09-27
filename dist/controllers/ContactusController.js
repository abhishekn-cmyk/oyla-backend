"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContactMessageById = exports.getAllContactMessages = exports.updateContactMessage = exports.addContactMessage = void 0;
const Contactus_1 = __importDefault(require("../models/Contactus"));
// Add a new contact message
const addContactMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const contact = new Contactus_1.default(req.body);
        yield contact.save();
        res.status(201).json(contact);
    }
    catch (err) {
        // Mongoose validation errors
        if (err.name === "ValidationError") {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message || err });
    }
});
exports.addContactMessage = addContactMessage;
// Update a contact message by ID
const updateContactMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Use runValidators: true to enforce schema validations on update
        const updatedContact = yield Contactus_1.default.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!updatedContact) {
            return res.status(404).json({ message: "Contact message not found" });
        }
        res.status(200).json(updatedContact);
    }
    catch (err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message || err });
    }
});
exports.updateContactMessage = updateContactMessage;
// Get all contact messages
const getAllContactMessages = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const contacts = yield Contactus_1.default.find().sort({ createdAt: -1 }); // latest first
        res.status(200).json(contacts);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.getAllContactMessages = getAllContactMessages;
// Get a single contact message by ID
const getContactMessageById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const contact = yield Contactus_1.default.findById(id);
        if (!contact) {
            return res.status(404).json({ message: "Contact message not found" });
        }
        res.status(200).json(contact);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.getContactMessageById = getContactMessageById;
