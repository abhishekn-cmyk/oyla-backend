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
exports.sendPushNotification = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
if (!firebase_admin_1.default.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccount),
    });
}
const sendPushNotification = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userFcmToken = yield getUserFcmToken(userId);
        if (!userFcmToken)
            return;
        const message = {
            token: userFcmToken,
            notification: { title: payload.title, body: payload.message },
            data: payload.metadata || {},
        };
        yield firebase_admin_1.default.messaging().send(message);
        console.log(`✅ Push sent to user ${userId}`);
    }
    catch (err) {
        console.error("Push notification error:", err);
    }
});
exports.sendPushNotification = sendPushNotification;
const getUserFcmToken = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    // Replace with your DB logic
    return "user-fcm-token";
});
