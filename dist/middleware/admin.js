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
exports.isAdmin = void 0;
const SuperAdmin_1 = __importDefault(require("../models/SuperAdmin"));
// Middleware to check if user is an admin
const isAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.headers["user-id"]; // Example: pass user ID in header
        if (!userId)
            return res.status(401).json({ message: "Unauthorized: User ID missing" });
        const user = yield SuperAdmin_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (user.role !== "superadmin") {
            return res.status(403).json({ message: "Forbidden: Admins only" });
        }
        next();
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
exports.isAdmin = isAdmin;
