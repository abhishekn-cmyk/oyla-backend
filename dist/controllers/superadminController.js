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
exports.updatePolicies = exports.getPolicies = exports.updateSuperAdminPassword = exports.updateSuperAdminProfile = exports.loginSuperAdmin = exports.registerSuperAdmin = void 0;
const SuperAdmin_1 = __importDefault(require("../models/SuperAdmin"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const protect_1 = require("../middleware/protect");
const registerSuperAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password, mobileNumber } = req.body;
        const existing = yield SuperAdmin_1.default.findOne({ email });
        if (existing)
            return res.status(400).json({ message: "Email already exists" });
        const superadmin = yield SuperAdmin_1.default.create({ username, email, password, mobileNumber });
        res.status(201).json({ message: "SuperAdmin registered", superadmin });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
exports.registerSuperAdmin = registerSuperAdmin;
const createDefaultSuperAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const defaultEmail = "oyla.admin@gmail.com";
        const defaultPassword = "oyla123";
        const existingAdmin = yield SuperAdmin_1.default.findOne({ email: defaultEmail });
        if (!existingAdmin) {
            const hashedPassword = yield bcryptjs_1.default.hash(defaultPassword, 10);
            yield new SuperAdmin_1.default({ email: defaultEmail, password: hashedPassword }).save();
            console.log("Default superadmin created in DB.");
        }
    }
    catch (err) {
        console.error("Error creating default superadmin:", err);
    }
});
const loginSuperAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        let superAdmin = yield SuperAdmin_1.default.findOne({ email });
        // If default superadmin does NOT exist, create it
        if (!superAdmin && email === "oyla.admin@gmail.com") {
            const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
            superAdmin = yield new SuperAdmin_1.default({
                email,
                password: hashedPassword,
                username: "Oylasuperadmin",
                role: "superadmin", // consistent role
            }).save();
            console.log("Default superadmin created in DB.");
        }
        // If still not found, reject login
        if (!superAdmin) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        // Generate JWT token
        const token = (0, protect_1.generateToken)(superAdmin.id.toString(), superAdmin.role);
        // Send response
        res.status(200).json({
            message: "Login successful",
            token,
            superadmin: {
                _id: superAdmin._id,
                email: superAdmin.email,
                role: superAdmin.role,
                username: "Oylasuperadmin"
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
exports.loginSuperAdmin = loginSuperAdmin;
const updateSuperAdminProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // SuperAdmin ID
        const { username, email, mobileNumber } = req.body;
        const profileImage = req.file ? req.file.path : undefined;
        const superadmin = yield SuperAdmin_1.default.findById(id);
        if (!superadmin)
            return res.status(404).json({ message: "SuperAdmin not found" });
        superadmin.name = username || superadmin.email;
        superadmin.email = email || superadmin.email;
        superadmin.phoneNumber = mobileNumber || superadmin.phoneNumber;
        if (profileImage)
            superadmin.profileImage = profileImage;
        yield superadmin.save();
        res.status(200).json({ message: "Profile updated", superadmin });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
exports.updateSuperAdminProfile = updateSuperAdminProfile;
const updateSuperAdminPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { oldPassword, newPassword } = req.body;
        console.log(oldPassword, newPassword);
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Old and new passwords are required" });
        }
        const superadmin = yield SuperAdmin_1.default.findById(id);
        if (!superadmin)
            return res.status(404).json({ message: "SuperAdmin not found" });
        // Compare old password
        // const isMatch = await superadmin.comparePassword(password:oldPassword);
        // console.log(isMatch);
        // if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });
        // Hash new password
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        superadmin.password = hashedPassword;
        yield superadmin.save();
        res.status(200).json({ message: "Password updated" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
exports.updateSuperAdminPassword = updateSuperAdminPassword;
const getPolicies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const adminId = req.params.id;
        const admin = yield SuperAdmin_1.default.findById(adminId).select("terms privacyPolicy renewalRules");
        if (!admin)
            return res.status(404).json({ error: "SuperAdmin not found" });
        res.json(admin);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch policies" });
    }
});
exports.getPolicies = getPolicies;
// Update SuperAdmin policies
const updatePolicies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const adminId = req.params.id;
        const { terms, privacyPolicy, renewalRules } = req.body;
        const admin = yield SuperAdmin_1.default.findById(adminId);
        if (!admin)
            return res.status(404).json({ error: "SuperAdmin not found" });
        admin.terms = terms || admin.terms;
        admin.privacyPolicy = privacyPolicy || admin.privacyPolicy;
        admin.renewalRules = renewalRules || admin.renewalRules;
        yield admin.save();
        res.json(admin);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to update policies" });
    }
});
exports.updatePolicies = updatePolicies;
