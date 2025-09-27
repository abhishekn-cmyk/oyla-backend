// api/index.ts
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import serverless from "serverless-http";
import cors from "cors";

// Routes
import authRoutes from "../src/routes/userRoutes";
import admin from "../src/routes/superadminRoutes";
import Language from "../src/routes/LanguageRoutes";
import Program from "../src/routes/ProgramRoutes";
import Product from "../src/routes/productRoutes";
import Restaurant from "../src/routes/RestaruntRoutes";
import Cart from "../src/routes/CartRouter";
import Order from "../src/routes/OrderRoutes";
import Privacy from "../src/routes/PrivacyRoutes";
import Rewards from "../src/routes/RewardRoutes";
import Contactus from "../src/routes/ContactusRoutes";
import Freeze from "../src/routes/freezeRoutes";
import SubscriptionRoutes from "../src/routes/subscriptionRoutes";
import WalletRoutes from "../src/routes/walletRoutes";
import CarouselRoutes from "../src/routes/carouselRoutes";
import SuccessStories from "../src/routes/successRoutes";

// Models for cron jobs
import Reward from "../src/models/Reward";
import Subscription from "../src/models/Subscription";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/auth", authRoutes);
app.use("/success", SuccessStories);
app.use("/freeze", Freeze);
app.use("/contactus", Contactus);
app.use("/admin", admin);
app.use("/language", Language);
app.use("/program", Program);
app.use("/product", Product);
app.use("/carousel", CarouselRoutes);
app.use("/restaurant", Restaurant);
app.use("/subscription", SubscriptionRoutes);
app.use("/wallet", WalletRoutes);
app.use("/cart", Cart);
app.use("/reward", Rewards);
app.use("/order", Order);
app.use("/privacy", Privacy);
app.use("/uploads", express.static("uploads"));

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Oyla Backend");
});

// Connect to MongoDB once
mongoose
  .connect(process.env.MONGO_URI || "")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Wrap Express with serverless
export default serverless(app);
