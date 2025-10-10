import cron from "node-cron";
import { subscriptionQueue } from "../queue/subscriptionQueue";

// Run every midnight
cron.schedule("0 0 * * *", async () => {
  console.log("⏰ Running subscription cron jobs...");

  await subscriptionQueue.add("expire-subscriptions", {});
  await subscriptionQueue.add("unfreeze-subscriptions", {});
  await subscriptionQueue.add("lock-meals", {});
});
