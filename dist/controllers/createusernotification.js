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
const Notification_1 = __importDefault(require("../models/Notification"));
const UserNotification_1 = __importDefault(require("../models/UserNotification"));
const server_1 = require("../server");
const createUserNotification = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, title, message, type = "cart", targetAudience = "user", createdBy = "system", channel = "inApp", metadata = {}, } = params;
    const notification = yield Notification_1.default.create({
        title,
        message,
        type,
        targetAudience,
        createdBy,
        priority: "high",
        read: false,
        metadata,
    });
    const userNotification = yield UserNotification_1.default.create({
        userId: new mongoose_1.Types.ObjectId(userId),
        notificationId: notification._id,
        status: "sent",
        channel,
    });
    server_1.io.to(userId.toString()).emit("newNotification", { notification, userNotification });
    return { notification, userNotification };
});
exports.createUserNotification = createUserNotification;
