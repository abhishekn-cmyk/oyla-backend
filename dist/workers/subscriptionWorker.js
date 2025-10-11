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
exports.subscriptionWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const Subscription_1 = __importDefault(require("../models/Subscription"));
const notificationService_1 = require("../services/notificationService");
// ---------------------- Redis Connection ----------------------
const connection = new ioredis_1.default(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
// ---------------------- Queue ----------------------
const subscriptionQueue = new bullmq_1.Queue("subscription-jobs", { connection });
// ---------------------- Worker ----------------------
exports.subscriptionWorker = new bullmq_1.Worker("subscription-jobs", (job) => __awaiter(void 0, void 0, void 0, function* () {
    switch (job.name) {
        case "expire-subscriptions":
            const expired = yield Subscription_1.default.updateMany({ endDate: { $lt: new Date() }, status: "active" }, { $set: { status: "expired" } });
            if (expired.modifiedCount > 0) {
                const subs = yield Subscription_1.default.find({
                    endDate: { $lt: new Date() },
                    status: "expired",
                });
                for (const sub of subs) {
                    yield (0, notificationService_1.sendNotification)(sub.userId, {
                        title: "Subscription Expired",
                        message: `Your subscription "${sub.planName}" has expired.`,
                    });
                }
            }
            break;
        case "unfreeze-subscriptions":
            const unfrozen = yield Subscription_1.default.updateMany({ isFrozen: true, "freezeHistory.endDate": { $lt: new Date() } }, { $set: { isFrozen: false, status: "active" } });
            if (unfrozen.modifiedCount > 0) {
                const subs = yield Subscription_1.default.find({ isFrozen: false, status: "active" });
                for (const sub of subs) {
                    yield (0, notificationService_1.sendNotification)(sub.userId, {
                        title: "Subscription Resumed",
                        message: `Your subscription "${sub.planName}" has resumed after freeze.`,
                    });
                }
            }
            break;
        case "lock-meals":
            const locked = yield Subscription_1.default.updateMany({
                "meals.date": { $lte: new Date(new Date().setDate(new Date().getDate() + 3)) },
                "meals.isLocked": false,
            }, { $set: { "meals.$[].isLocked": true } });
            if (locked.modifiedCount > 0) {
                const subs = yield Subscription_1.default.find({ "meals.isLocked": true });
                for (const sub of subs) {
                    yield (0, notificationService_1.sendNotification)(sub.userId, {
                        title: "Meals Locked",
                        message: `Your meals for the next 3 days are now locked.`,
                    });
                }
            }
            break;
    }
}), { connection });
// ---------------------- Event Listeners ----------------------
exports.subscriptionWorker.on("completed", (job) => {
    console.log(`✅ Job ${job.name} completed`);
});
exports.subscriptionWorker.on("failed", (job, err) => {
    console.error(`❌ Job ${job === null || job === void 0 ? void 0 : job.name} failed:`, err);
});
// ---------------------- Optional: Manual Cron ----------------------
// Push jobs to the queue every day at midnight
const pushDailyJobs = () => __awaiter(void 0, void 0, void 0, function* () {
    yield subscriptionQueue.add("expire-subscriptions", {}, { removeOnComplete: true });
    yield subscriptionQueue.add("unfreeze-subscriptions", {}, { removeOnComplete: true });
    yield subscriptionQueue.add("lock-meals", {}, { removeOnComplete: true });
});
// Example: run every day (86400000ms = 24h)
setInterval(pushDailyJobs, 24 * 60 * 60 * 1000);
// Run once immediately on startup
pushDailyJobs();
