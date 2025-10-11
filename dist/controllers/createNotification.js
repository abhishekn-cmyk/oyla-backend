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
exports.createUserNotification = void 0;
const mongoose_1 = require("mongoose");
const server_1 = require("../server");
const Notification_1 = __importDefault(require("../models/Notification"));
const UserNotification_1 = __importDefault(require("../models/UserNotification"));
// Create notification and link it to a user
const createUserNotification = (userId_1, title_1, message_1, ...args_1) => __awaiter(void 0, [userId_1, title_1, message_1, ...args_1], void 0, function* (userId, title, message, channel = "inApp") {
    try {
        // 1️⃣ Create the notification in Notification collection
        const notification = yield Notification_1.default.create({
            title,
            message,
            type: "cart", // or dynamic type
            priority: "high",
            read: false,
        });
        // 2️⃣ Create the user-specific notification
        const userNotification = yield UserNotification_1.default.create({
            userId: new mongoose_1.Types.ObjectId(userId),
            notificationId: notification._id,
            status: "sent",
            channel,
        });
        // 3️⃣ Emit real-time notification via Socket.IO
        server_1.io.to(userId).emit("newNotification", {
            notification,
            userNotification,
        });
        return { notification, userNotification };
    }
    catch (err) {
        console.error("Error creating user notification:", err);
        throw err;
    }
});
exports.createUserNotification = createUserNotification;
