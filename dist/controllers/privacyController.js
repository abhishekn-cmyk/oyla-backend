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
exports.deletePrivacyPolicy = exports.getAllPrivacyPolicies = exports.getActivePrivacyPolicy = exports.updatePrivacyPolicy = exports.createPrivacyPolicy = void 0;
const Privacy_1 = __importDefault(require("../models/Privacy"));
// Create a new privacy policy
const createPrivacyPolicy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, content, version, effectiveDate } = req.body;
        // Optional: deactivate current active policy
        yield Privacy_1.default.updateMany({ isActive: true }, { isActive: false });
        const policy = new Privacy_1.default({
            title,
            content,
            version,
            effectiveDate,
            isActive: true,
        });
        yield policy.save();
        res.status(201).json(policy);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.createPrivacyPolicy = createPrivacyPolicy;
// Update an existing policy by ID
const updatePrivacyPolicy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { policyId } = req.params;
        const updateData = req.body;
        const policy = yield Privacy_1.default.findByIdAndUpdate(policyId, updateData, {
            new: true,
        });
        if (!policy)
            return res.status(404).json({ message: "Policy not found" });
        res.status(200).json(policy);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.updatePrivacyPolicy = updatePrivacyPolicy;
// Get the currently active policy
const getActivePrivacyPolicy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const policy = yield Privacy_1.default.findOne({ isActive: true });
        if (!policy)
            return res.status(404).json({ message: "No active privacy policy found" });
        res.status(200).json(policy);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.getActivePrivacyPolicy = getActivePrivacyPolicy;
// Get all policies (history)
const getAllPrivacyPolicies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const policies = yield Privacy_1.default.find().sort({ createdAt: -1 });
        res.status(200).json(policies);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.getAllPrivacyPolicies = getAllPrivacyPolicies;
const deletePrivacyPolicy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { policyId } = req.params;
        const policy = yield Privacy_1.default.findById(policyId);
        if (!policy)
            return res.status(404).json({ message: "Policy not found" });
        yield policy.deleteOne();
        res.status(200).json({ message: "Policy deleted successfully" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
exports.deletePrivacyPolicy = deletePrivacyPolicy;
