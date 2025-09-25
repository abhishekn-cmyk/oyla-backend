import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/userRoutes";
import cors from "cors";
dotenv.config();
import admin from "./routes/superadminRoutes";
import Language from "./routes/LanguageRoutes";
import Program from "./routes/ProgramRoutes";
import Product from "./routes/productRoutes";
import Restaurant from "./routes/RestaruntRoutes";
import Cart from "./routes/CartRouter";
import Order from "./routes/OrderRoutes";
import Privacy from "./routes/PrivacyRoutes";
import Rewards from "./routes/RewardRoutes";
import cron from "node-cron";
import Reward from "./models/Reward";
import Subscription from "./models/Subscription";
import Contactus from "./routes/ContactusRoutes";
import Freeze from "./routes/freezeRoutes";
import SubscriptionRoutes from "./routes/subscriptionRoutes";
import WalletRoutes from "./routes/walletRoutes";
import CarouselRoutes from "./routes/carouselRoutes";
import SuccessStories from "./routes/successRoutes";
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Run every day at midnight
cron.schedule("0 0 * * *", async () => {
  const now = new Date();
  const result = await Reward.deleteMany({ expiryDate: { $lte: now } });
  console.log(`Deleted ${result.deletedCount} expired rewards`);
});

cron.schedule("0 0 * * *", async () => {
  const now = new Date();
  await Subscription.updateMany(
    { endDate: { $lt: now }, status: "active" },
    { $set: { status: "expired" } }
  );
  console.log("✅ Expired subscriptions updated");
});
cron.schedule("0 0 * * *", async () => {
  console.log("⏰ Running daily subscription maintenance job...");

  const now = new Date();

  // Expire subscriptions whose endDate passed
  await Subscription.updateMany(
    { status: "active", endDate: { $lt: now } },
    { $set: { status: "expired" } }
  );

  // Unfreeze subscriptions whose freeze period ended
  const subs = await Subscription.find({ status: "freeze" });
  for (const sub of subs) {
    const lastFreeze = sub.freezeHistory[sub.freezeHistory.length - 1];
    if (lastFreeze && lastFreeze.endDate < now) {
      sub.status = "active";
      await sub.save();
    }
  }

  console.log("✅ Subscription statuses updated");
});
app.use("/auth", authRoutes);
app.use('/success',SuccessStories);
app.use('/freeze',Freeze);
app.use('/contactus',Contactus);
app.use('/admin',admin);
app.use('/language',Language);
app.use('/program',Program);
app.use('/product',Product);
app.use('/carousel',CarouselRoutes);
app.use('/restaurant',Restaurant);
app.use('/subscription',SubscriptionRoutes);
app.use('/wallet',WalletRoutes);
app.use('/cart',Cart);
app.use('/reward',Rewards);
app.use('/order',Order);
app.use('/privacy',Privacy);
app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI || "")
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error(err));
