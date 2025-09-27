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
exports.getAllUsers = exports.getUserById = exports.PostProfile = exports.updateProfile = exports.socialLogin = exports.verifyOtp = exports.sendOtp = exports.login = exports.signup = void 0;
const User_1 = __importDefault(require("../models/User"));
const hash_1 = require("../util/hash");
const crypto_1 = __importDefault(require("crypto"));
const moment_1 = __importDefault(require("moment"));
const protect_1 = require("../middleware/protect"); // your JWT generator
// ==================== Signup ====================
const signup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Signup request body:", req.body);
    const { email, password, username } = req.body;
    try {
        const existingUser = yield User_1.default.findOne({ email });
        if (existingUser)
            return res.status(400).json({ message: "Email exists" });
        const hashedPassword = yield (0, hash_1.hashPassword)(password);
        const user = yield User_1.default.create({
            email,
            password: hashedPassword,
            username,
            isVerified: false,
        });
        res.status(201).json({ user, message: "Signup successful, verify OTP" });
    }
    catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ error: err });
    }
});
exports.signup = signup;
// ==================== Login ====================
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield User_1.default.findOne({ email });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (!user.password)
            return res.status(400).json({ message: "Use social login" });
        const isMatch = yield (0, hash_1.comparePassword)(password, user.password);
        if (!isMatch)
            return res.status(400).json({ message: "Invalid password" });
        const token = (0, protect_1.generateToken)(user._id.toString(), user.role);
        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.username,
                email: user.email,
                role: user.role,
            },
            token,
        });
    }
    catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: err });
    }
});
exports.login = login;
// ==================== Send OTP ====================
const sendOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    try {
        const user = yield User_1.default.findOne({ email });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const otpCode = crypto_1.default.randomInt(100000, 999999).toString();
        user.otpCode = otpCode;
        yield user.save();
        // TODO: send OTP to email/mobile
        res.status(200).json({ message: "OTP sent", otp: otpCode }); // remove otp in production
    }
    catch (err) {
        console.error("Send OTP error:", err);
        res.status(500).json({ error: err });
    }
});
exports.sendOtp = sendOtp;
// ==================== Verify OTP ====================
const verifyOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, otpCode } = req.body;
    try {
        const user = yield User_1.default.findOne({ email });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (user.otpCode !== otpCode)
            return res.status(400).json({ message: "Invalid OTP" });
        user.isVerified = true;
        user.otpCode = undefined;
        yield user.save();
        res.status(200).json({ message: "OTP verified", user });
    }
    catch (err) {
        console.error("Verify OTP error:", err);
        res.status(500).json({ error: err });
    }
});
exports.verifyOtp = verifyOtp;
// ==================== Social Login ====================
const socialLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, googleId, facebookId, firstName, lastName } = req.body;
    try {
        let user = yield User_1.default.findOne({ email });
        if (user) {
            if (googleId && !user.googleId)
                user.googleId = googleId;
            if (facebookId && !user.facebookId)
                user.facebookId = facebookId;
            user.isVerified = true;
            yield user.save();
        }
        else {
            user = yield User_1.default.create({
                email,
                googleId,
                facebookId,
                isVerified: true,
                profile: {
                    selectedPrograms: [],
                    firstName: firstName || "",
                    lastName: lastName || "",
                    dob: undefined,
                    gender: undefined,
                    address: undefined,
                    mobileNumber: undefined,
                    profileImage: undefined,
                },
            });
        }
        res.status(200).json({ user });
    }
    catch (err) {
        console.error("Social login error:", err);
        res.status(500).json({ error: err });
    }
});
exports.socialLogin = socialLogin;
// ==================== Update Profile ====================
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, firstName, lastName, dob, gender, address, mobileNumber } = req.body;
    try {
        const user = yield User_1.default.findOne({ email });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        // Ensure profile exists
        if (!user.profile) {
            user.profile = {
                selectedPrograms: [],
                firstName: "",
                lastName: "",
                dob: undefined,
                gender: undefined,
                address: undefined,
                mobileNumber: undefined,
                profileImage: undefined,
            };
        }
        let dobDate = user.profile.dob;
        if (dob) {
            const parsedDob = (0, moment_1.default)(dob, "DD-MM-YYYY", true);
            if (parsedDob.isValid()) {
                dobDate = parsedDob.toDate();
            }
            else {
                return res.status(400).json({ message: "Invalid date format. Use DD-MM-YYYY" });
            }
        }
        const profileImage = req.file ? req.file.path : user.profile.profileImage;
        user.profile = {
            selectedPrograms: user.profile.selectedPrograms || [],
            firstName: firstName || user.profile.firstName || "",
            lastName: lastName || user.profile.lastName || "",
            dob: dobDate,
            gender: gender || user.profile.gender || "",
            address: address || user.profile.address || "",
            mobileNumber: mobileNumber || user.profile.mobileNumber || "",
            profileImage,
        };
        yield user.save();
        const responseUser = Object.assign(Object.assign({}, user.toObject()), { profile: Object.assign(Object.assign({}, user.profile), { dob: user.profile.dob ? (0, moment_1.default)(user.profile.dob).format("DD-MM-YYYY") : null }) });
        res.status(200).json({ message: "Profile updated", user: responseUser });
    }
    catch (err) {
        console.error("Update profile error:", err);
        res.status(500).json({ error: err });
    }
});
exports.updateProfile = updateProfile;
// ==================== Post Profile ====================
const PostProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { email, firstName, lastName, dob, gender, address, mobileNumber } = req.body;
    try {
        const user = yield User_1.default.findOne({ email });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (!user.profile) {
            user.profile = {
                selectedPrograms: [],
                firstName: "",
                lastName: "",
                dob: undefined,
                gender: undefined,
                address: undefined,
                mobileNumber: undefined,
                profileImage: undefined,
            };
        }
        let dobDate = ((_a = user.profile) === null || _a === void 0 ? void 0 : _a.dob) || undefined;
        if (dob) {
            const parsedDob = (0, moment_1.default)(dob, "DD-MM-YYYY", true);
            if (parsedDob.isValid()) {
                dobDate = parsedDob.toDate();
            }
            else {
                return res.status(400).json({ message: "Invalid date format. Use DD-MM-YYYY" });
            }
        }
        else {
            dobDate = undefined;
        }
        const profileImage = req.file ? req.file.path : user.profile.profileImage;
        user.profile = {
            selectedPrograms: user.profile.selectedPrograms || [],
            firstName: firstName || user.profile.firstName || "",
            lastName: lastName || user.profile.lastName || "",
            dob: dobDate,
            gender: gender || user.profile.gender || "",
            address: address || user.profile.address || "",
            mobileNumber: mobileNumber || user.profile.mobileNumber || "",
            profileImage,
        };
        yield user.save();
        const responseUser = Object.assign(Object.assign({}, user.toObject()), { profile: Object.assign(Object.assign({}, user.profile), { dob: user.profile.dob ? (0, moment_1.default)(user.profile.dob).format("DD-MM-YYYY") : null }) });
        res.status(200).json({ message: "Profile added", user: responseUser });
    }
    catch (err) {
        console.error("Post profile error:", err);
        res.status(500).json({ error: err });
    }
});
exports.PostProfile = PostProfile;
// ==================== Get User by ID ====================
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ message: "User ID is required" });
        const user = yield User_1.default.findById(id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const responseUser = Object.assign(Object.assign({}, user.toObject()), { profile: Object.assign(Object.assign({}, user.profile), { dob: ((_a = user.profile) === null || _a === void 0 ? void 0 : _a.dob) ? (0, moment_1.default)(user.profile.dob).format("DD-MM-YYYY") : null }) });
        res.status(200).json({ user: responseUser });
    }
    catch (err) {
        console.error("Get user by ID error:", err);
        res.status(500).json({ error: "Server error" });
    }
});
exports.getUserById = getUserById;
// ==================== Get All Users ====================
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield User_1.default.find();
        const responseUsers = users.map((user) => {
            var _a;
            return (Object.assign(Object.assign({}, user.toObject()), { profile: Object.assign(Object.assign({}, user.profile), { dob: ((_a = user.profile) === null || _a === void 0 ? void 0 : _a.dob) ? (0, moment_1.default)(user.profile.dob).format("DD-MM-YYYY") : null }) }));
        });
        res.status(200).json({ users: responseUsers });
    }
    catch (err) {
        console.error("Get all users error:", err);
        res.status(500).json({ error: "Server error" });
    }
});
exports.getAllUsers = getAllUsers;
