// server.ts
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import cron from "node-cron";

// Routes
import authRoutes from "./routes/userRoutes";
import systemRoutes from "./routes/SystemRoutes";
import ExpenseRoutes from "./routes/expenseRoutes";
import adminRoutes from "./routes/superadminRoutes";
import languageRoutes from "./routes/LanguageRoutes";
import programRoutes from "./routes/ProgramRoutes";
import productRoutes from "./routes/productRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import RestaurantRoutes from "./routes/RestaruntRoutes"; // fixed typo
import cartRoutes from "./routes/CartRouter";
import DeliveryRoutes from "./routes/deliveryRoutes"; // fixed typo
import orderRoutes from "./routes/OrderRoutes";
import privacyRoutes from "./routes/PrivacyRoutes";
import rewardRoutes from "./routes/RewardRoutes";
import contactusRoutes from "./routes/ContactusRoutes";
import freezeRoutes from "./routes/freezeRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import walletRoutes from "./routes/walletRoutes";
import carouselRoutes from "./routes/carouselRoutes";
import successRoutes from "./routes/successRoutes";
import DriverRoutes from "./routes/driverRoutes";
// Models
import Notification from "./models/Notification";
import Reward from "./models/Reward";
import Subscription from "./models/Subscription";

// Middleware
import { isAdmin } from "./middleware/admin";

// Cron / Workers
import "./cron/subscriptionCron";
import "./workers/subscriptionWorker";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server for socket.io
const server = http.createServer(app);
export const io = new Server(server, {
  cors: { origin: "*" },
});

// ------------------ Socket.IO ------------------
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join", (userId: string) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on("join_room", (room: string) => {
    socket.join(room);
    console.log(`Joined room: ${room}`);
  });

  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

// ------------------ Cron Jobs ------------------
// Delete expired rewards daily at midnight
cron.schedule("0 0 * * *", async () => {
  const now = new Date();
  const result = await Reward.deleteMany({ expiryDate: { $lte: now } });
  console.log(`Deleted ${result.deletedCount} expired rewards`);
});

// Expire subscriptions daily at midnight
cron.schedule("0 0 * * *", async () => {
  const now = new Date();
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

  console.log("✅ Subscription maintenance completed");
});

// ------------------ Test / Dashboard ------------------
app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Oyla Backend");
});

app.get("/dashboard", isAdmin, async (req: Request, res: Response) => {
  try {
    const notifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({
      message: "Welcome to the admin dashboard!",
      notifications,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------ API Routes ------------------
app.use("/auth", authRoutes);
app.use('/expenses',ExpenseRoutes);
app.use("/notification", notificationRoutes);
app.use("/success", successRoutes);
app.use("/freeze", freezeRoutes);
app.use("/contactus", contactusRoutes);
app.use("/admin", adminRoutes);
app.use("/language", languageRoutes);
app.use("/program", programRoutes);
app.use("/product", productRoutes);
app.use("/carousel", carouselRoutes);
app.use("/restaurant", RestaurantRoutes);
app.use("/subscription", subscriptionRoutes);
app.use("/wallet", walletRoutes);
app.use("/cart", cartRoutes);
app.use("/reward", rewardRoutes);
app.use("/system", systemRoutes);
app.use("/order", orderRoutes);
app.use("/delivery", DeliveryRoutes);
app.use("/privacy", privacyRoutes);
app.use('/driver',DriverRoutes);
app.use("/uploads", express.static("uploads"));

// ------------------ MongoDB & Server ------------------
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI || "")
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));
