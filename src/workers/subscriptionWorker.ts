import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import Subscription from "../models/Subscription";
import { sendNotification } from "../services/notificationService";

// ---------------------- Redis Connection ----------------------
const connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// ---------------------- Queue ----------------------
const subscriptionQueue = new Queue("subscription-jobs", { connection });

// ---------------------- Worker ----------------------
export const subscriptionWorker = new Worker(
  "subscription-jobs",
  async (job) => {
    switch (job.name) {
      case "expire-subscriptions":
        const expired = await Subscription.updateMany(
          { endDate: { $lt: new Date() }, status: "active" },
          { $set: { status: "expired" } }
        );

        if (expired.modifiedCount > 0) {
          const subs = await Subscription.find({
            endDate: { $lt: new Date() },
            status: "expired",
          });
          for (const sub of subs) {
            await sendNotification(sub.userId, {
              title: "Subscription Expired",
              message: `Your subscription "${sub.planName}" has expired.`,
            });
          }
        }
        break;

      case "unfreeze-subscriptions":
        const unfrozen = await Subscription.updateMany(
          { isFrozen: true, "freezeHistory.endDate": { $lt: new Date() } },
          { $set: { isFrozen: false, status: "active" } }
        );

        if (unfrozen.modifiedCount > 0) {
          const subs = await Subscription.find({ isFrozen: false, status: "active" });
          for (const sub of subs) {
            await sendNotification(sub.userId, {
              title: "Subscription Resumed",
              message: `Your subscription "${sub.planName}" has resumed after freeze.`,
            });
          }
        }
        break;

      case "lock-meals":
        const locked = await Subscription.updateMany(
          {
            "meals.date": { $lte: new Date(new Date().setDate(new Date().getDate() + 3)) },
            "meals.isLocked": false,
          },
          { $set: { "meals.$[].isLocked": true } }
        );

        if (locked.modifiedCount > 0) {
          const subs = await Subscription.find({ "meals.isLocked": true });
          for (const sub of subs) {
            await sendNotification(sub.userId, {
              title: "Meals Locked",
              message: `Your meals for the next 3 days are now locked.`,
            });
          }
        }
        break;
    }
  },
  { connection }
);

// ---------------------- Event Listeners ----------------------
subscriptionWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.name} completed`);
});

subscriptionWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.name} failed:`, err);
});

// ---------------------- Optional: Manual Cron ----------------------
// Push jobs to the queue every day at midnight
const pushDailyJobs = async () => {
  await subscriptionQueue.add("expire-subscriptions", {}, { removeOnComplete: true });
  await subscriptionQueue.add("unfreeze-subscriptions", {}, { removeOnComplete: true });
  await subscriptionQueue.add("lock-meals", {}, { removeOnComplete: true });
};

// Example: run every day (86400000ms = 24h)
setInterval(pushDailyJobs, 24 * 60 * 60 * 1000);
// Run once immediately on startup
pushDailyJobs();
