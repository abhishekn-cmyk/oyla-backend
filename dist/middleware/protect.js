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
exports.protect = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const SuperAdmin_1 = __importDefault(require("../models/SuperAdmin"));
const User_1 = __importDefault(require("../models/User"));
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
const generateToken = (userId, role) => { return jsonwebtoken_1.default.sign({ id: userId, role }, JWT_SECRET, { expiresIn: "30d" }); };
exports.generateToken = generateToken;
exports.protect = (0, express_async_handler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ success: false, message: "Not authorized, no token" });
        throw new Error("Not authorized, no token");
    }
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        res.status(401).json({ success: false, message: "Token is invalid" });
        throw new Error("Token is invalid");
    }
    // Make role case-insensitive
    const role = (_a = decoded.role) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    let user;
    if (role === "user")
        user = yield User_1.default.findById(decoded.id);
    else if (role === "superadmin")
        user = yield SuperAdmin_1.default.findById(decoded.id);
    if (!user) {
        res.status(401).json({ success: false, message: "User not found" });
        throw new Error("User not found");
    }
    req.user = user;
    next();
}));
