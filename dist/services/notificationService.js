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
const emailService_1 = require("./emailService");
const pushService_1 = require("./pushService");
const smsService_1 = require("./smsService");
const User_1 = __importDefault(require("../models/User"));
/**
 * Central notification handler
 */
const sendNotification = (userId_1, payload_1, ...args_1) => __awaiter(void 0, [userId_1, payload_1, ...args_1], void 0, function* (userId, payload, channels = "all") {
    try {
        const user = yield User_1.default.findById(userId);
        if (!user)
            return;
        // Email
        if (channels === "email" || channels === "all") {
            if (user.email) {
                yield (0, emailService_1.sendEmail)(user.email, payload.title, payload.message);
            }
        }
        // Push
        if (channels === "push" || channels === "all") {
            yield (0, pushService_1.sendPushNotification)(userId, payload);
        }
        // SMS
        if (channels === "sms" || channels === "all") {
            if (user.profile.mobileNumber) {
                yield (0, smsService_1.sendSMS)(user.profile.mobileNumber, payload.message);
            }
        }
        console.log(`📢 Notification sent to ${user._id} via ${channels}`);
    }
    catch (err) {
        console.error("Notification error:", err);
    }
});
exports.sendNotification = sendNotification;
