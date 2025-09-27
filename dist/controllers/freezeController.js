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
exports.getAllFreezes = exports.deleteFreeze = exports.cancelFreeze = exports.getFreezeById = exports.getFreezesByUser = exports.updateFreeze = exports.addFreeze = void 0;
const Freeze_1 = __importDefault(require("../models/Freeze"));
const mongoose_1 = __importDefault(require("mongoose"));
// -------------------- ADD FREEZE --------------------
const addFreeze = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { productId, freezeDate, meals } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId) || !mongoose_1.default.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: "Invalid user or product ID" });
        }
        const existingFreeze = yield Freeze_1.default.findOne({ userId, productId, freezeDate });
        if (existingFreeze)
            return res.status(400).json({ message: "Freeze already exists for this product/date" });
        const freeze = new Freeze_1.default({
            userId,
            productId,
            freezeDate,
            meals,
            selectedDate: new Date()
        });
        yield freeze.save();
        yield freeze.populate('userId');
        yield freeze.populate('productId');
        res.status(201).json(freeze);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.addFreeze = addFreeze;
// -------------------- UPDATE FREEZE --------------------
const updateFreeze = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedFreeze = yield Freeze_1.default.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).populate('userId').populate('productId');
        if (!updatedFreeze)
            return res.status(404).json({ message: "Freeze not found" });
        res.status(200).json(updatedFreeze);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.updateFreeze = updateFreeze;
// -------------------- GET FREEZES BY USER --------------------
const getFreezesByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const freezes = yield Freeze_1.default.find({ userId })
            .sort({ freezeDate: -1 })
            .populate('userId') // populate user details
            .populate('productId'); // populate product details
        res.status(200).json(freezes);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.getFreezesByUser = getFreezesByUser;
// -------------------- GET FREEZE BY ID --------------------
const getFreezeById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const freeze = yield Freeze_1.default.findById(id)
            .populate('userId')
            .populate('productId');
        if (!freeze)
            return res.status(404).json({ message: "Freeze not found" });
        res.status(200).json(freeze);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.getFreezeById = getFreezeById;
// -------------------- CANCEL FREEZE (SOFT DELETE) --------------------
const cancelFreeze = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const freeze = yield Freeze_1.default.findByIdAndUpdate(id, { status: "cancelled" }, { new: true }).populate('userId').populate('productId');
        if (!freeze)
            return res.status(404).json({ message: "Freeze not found" });
        res.status(200).json({ message: "Freeze cancelled successfully", freeze });
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.cancelFreeze = cancelFreeze;
// -------------------- DELETE FREEZE --------------------
const deleteFreeze = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const freeze = yield Freeze_1.default.findByIdAndDelete(id).populate('userId').populate('productId');
        if (!freeze)
            return res.status(404).json({ message: "Freeze not found" });
        res.status(200).json({ message: "Freeze deleted successfully", freeze });
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.deleteFreeze = deleteFreeze;
// -------------------- GET ALL FREEZES --------------------
const getAllFreezes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const freezes = yield Freeze_1.default.find()
            .sort({ freezeDate: -1 }) // latest first
            .populate("userId")
            .populate("productId");
        res.status(200).json(freezes);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.getAllFreezes = getAllFreezes;
