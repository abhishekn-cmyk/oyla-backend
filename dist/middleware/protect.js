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
exports.generateToken = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const User_1 = __importDefault(require("../models/User"));
const SuperAdmin_1 = __importDefault(require("../models/SuperAdmin"));
exports.protect = (0, express_async_handler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ success: false, message: "Not authorized, no token" });
            return;
        }
        const token = authHeader.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (!decoded.sub || !decoded.role) {
            res.status(401).json({ success: false, message: "Token payload invalid" });
            return;
        }
        let user = null;
        if (decoded.role.toLowerCase() === "superadmin") {
            user = yield SuperAdmin_1.default.findById(decoded.sub).select("-password");
        }
        else {
            user = yield User_1.default.findById(decoded.sub).select("-password");
        }
        if (!user) {
            res.status(401).json({ success: false, message: "User not found" });
            return;
        }
        // Map Mongoose document to plain object
        req.user = {
            _id: user.id.toString(),
            role: user.role,
            email: "email" in user ? user.email : undefined,
            username: "username" in user ? user.username : undefined,
        };
        next();
    }
    catch (err) {
        console.error("Protect middleware error:", err);
        res.status(401).json({ success: false, message: "Token is invalid or expired" });
    }
}));
const generateToken = (id, role) => {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error('JWT_SECRET is not defined');
    const payload = { sub: id, role };
    // Ensure expiresIn is correctly typed
    const expiresIn = process.env.JWT_EXPIRE || '30d';
    const options = { expiresIn };
    return jsonwebtoken_1.default.sign(payload, secret, options);
};
exports.generateToken = generateToken;
