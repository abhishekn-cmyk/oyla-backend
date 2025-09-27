import { VercelRequest, VercelResponse } from "@vercel/node";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Reward from "../src/models/Reward";
import Subscription from "../src/models/Subscription";

dotenv.config();

// MongoDB connection
let isConnected = false;
const connectToDB = async () => {
  if (!isConnected) {
    await mongoose.connect(process.env.MONGO_URI || "");
    isConnected = true;
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await connectToDB();

  try {
    const now = new Date();

    // Expire rewards
    const rewardsResult = await Reward.deleteMany({ expiryDate: { $lte: now } });

    // Expire subscriptions
    await Subscription.updateMany(
      { endDate: { $lt: now }, status: "active" },
      { status: "expired" }
    );

    // Unfreeze subscriptions
    const subs = await Subscription.find({ status: "freeze" });
    for (const sub of subs) {
      const lastFreeze = sub.freezeHistory[sub.freezeHistory.length - 1];
      if (lastFreeze && lastFreeze.endDate < now) {
        sub.status = "active";
        await sub.save();
      }
    }

    return res.status(200).json({
      message: "Jobs executed",
      rewardsDeleted: rewardsResult.deletedCount,
      subscriptionsUpdated: subs.length
    });
  } catch (err) {
    return res.status(500).json({ error: err });
  }
}
