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
exports.sendNotification = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const UserNotification_1 = __importDefault(require("../models/UserNotification")); // optional: if you keep user-specific records
const socket_1 = require("./socket");
const mongoose_1 = require("mongoose");
/**
 * Saves a Notification doc, optionally a UserNotification link, and emits via Socket.IO
 */
const sendNotification = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { recipientId, recipientType, title, type, message, relatedDelivery, channel = "inApp" } = params;
    // 1) create generic notification object
    const notification = yield Notification_1.default.create({
        title,
        message,
        type: "delivery", // ✅ valid
        targetAudience: recipientType === "user"
            ? "customers"
            : recipientType === "driver"
                ? "delivery_partners"
                : "admins",
        channels: {
            inApp: true,
            push: false,
            email: false,
            sms: false,
        },
        createdBy: "system", // or your adminId, if applicable
        createdAt: new Date(),
    });
    // 2) create user-specific notification record if you have a UserNotification model (optional)
    // Wrap in try/catch if model may not exist
    try {
        if (UserNotification_1.default) {
            yield UserNotification_1.default.create({
                userId: new mongoose_1.Types.ObjectId ? new mongoose_1.Types.ObjectId(recipientId) : null,
                notificationId: notification._id,
                channel,
                status: "sent",
            });
        }
    }
    catch (err) {
        // swallow - optional model not found / schema mismatch
        // console.warn("UserNotification creation skipped:", err);
    }
    // 3) emit via socket to the recipient's room (use recipientId as room)
    try {
        const io = (0, socket_1.getIO)();
        io.to(recipientId).emit("notification", notification);
    }
    catch (err) {
        // socket may not be initialized — that's ok, we still have DB record
        // console.warn("Socket emit failed (maybe not initialized):", err);
    }
    return notification;
});
exports.sendNotification = sendNotification;
