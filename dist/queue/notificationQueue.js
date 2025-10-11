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
exports.notificationQueue = void 0;
const bull_1 = __importDefault(require("bull"));
const Notification_1 = __importDefault(require("../models/Notification"));
const User_1 = __importDefault(require("../models/User"));
const pushService_1 = require("../services/pushService");
const emailService_1 = require("../services/emailService");
const smsService_1 = require("../services/smsService");
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
exports.notificationQueue = new bull_1.default("notificationQueue", REDIS_URL);
// Process jobs
exports.notificationQueue.process((job) => __awaiter(void 0, void 0, void 0, function* () {
    const { notificationId } = job.data;
    const notification = yield Notification_1.default.findById(notificationId);
    if (!notification)
        return;
    // Determine recipients
    let recipients = [];
    const { targetAudience, specificUsers, channels, title, message, metadata } = notification;
    switch (targetAudience) {
        case "all":
            recipients = yield User_1.default.find({}, "_id email phone fcmToken");
            break;
        case "specific_users":
            if (specificUsers === null || specificUsers === void 0 ? void 0 : specificUsers.length)
                recipients = yield User_1.default.find({ _id: { $in: specificUsers } }, "_id email phone fcmToken");
            break;
        case "customers":
            recipients = yield User_1.default.find({ role: "user" }, "_id email phone fcmToken");
            break;
        case "delivery_partners":
            recipients = yield User_1.default.find({ role: "delivery_partner" }, "_id email phone fcmToken");
            break;
        case "admins":
            recipients = yield User_1.default.find({ role: "admin" }, "_id email phone fcmToken");
            break;
    }
    // Send notifications
    for (const user of recipients) {
        if (((channels === null || channels === void 0 ? void 0 : channels.push) || (channels === null || channels === void 0 ? void 0 : channels.inApp)) && user.fcmToken) {
            yield (0, pushService_1.sendPushNotification)(user._id, { title, message, metadata });
        }
        if ((channels === null || channels === void 0 ? void 0 : channels.email) && user.email)
            yield (0, emailService_1.sendEmail)(user.email, title, message);
        if ((channels === null || channels === void 0 ? void 0 : channels.sms) && user.phone)
            yield (0, smsService_1.sendSMS)(user.phone, message);
    }
    // Update stats
    notification.stats = notification.stats || { totalSent: 0, delivered: 0, opened: 0, clicked: 0 };
    notification.stats.totalSent = recipients.length;
    notification.stats.delivered = recipients.length;
    notification.status = "sent";
    notification.sentAt = new Date();
    yield notification.save();
}));
