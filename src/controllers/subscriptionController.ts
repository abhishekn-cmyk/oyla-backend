import { Request, Response } from "express";
import NodeCache from "node-cache";
import Stripe from "stripe";

import Payment from "../models/Payment";
import PaymentModel from "../models/Payment";
import Subscription from "../models/Subscription";
import { MealSchema } from "../models/Subscription";
import User from "../models/User";
import ProductModel from "../models/Product";
import SystemSettings from "../models/SystemSettings";
import { DailyOrder } from "../models/DailyOrder";
import { Wallet, WalletHistory } from "../models/Wallet";
import type { IPayment } from "../models/Payment";
// controllers/subscriptionController.ts
import mongoose, { Types } from "mongoose";


import { config } from "dotenv";
config();
const mealCache = new NodeCache({ stdTTL: 3600 });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-08-27.basil" });
import { createUserNotification } from "./createNotification";
import { io } from "../server";

export const setSetting = async <T>(key: string, value: T): Promise<void> => {
  await SystemSettings.updateOne({ key }, { value }, { upsert: true });
};
export const updateChangeWindow = async (req: Request, res: Response) => {
  try {
    const { days } = req.body; // e.g., { days: 5 }
    if (typeof days !== "number" || days <= 0) {
      return res.status(400).json({ message: "Invalid days value" });
    }

    await setSetting("subscription.changeWindowDays", days);
    return res.json({ message: `Change window updated to ${days} days` });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: "Failed to update change window" });
  }
};
// -------------------- USER CHECKOUT --------------------
export const checkoutSubscription = async (req: Request, res: Response) => {
  await createSubscriptionUser(req, res);
};

// -------------------- CREATE SUBSCRIPTION (USER + WALLET + STRIPE) --------------------
export const createSubscriptionUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const {
      durationDays,
      mealsPerDay,
      startDate,
      planType,
      mealSelections = [],
      autoRenew = false,
      paymentMethod,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // ---------------- PRICE CALCULATION ----------------
    const basePrice = (await SystemSettings.findOne({ key: "price_per_meal" }))?.value || 150; // KWD value
    const discount = durationDays === 14 ? 0.05 : durationDays === 28 ? 0.1 : 0;
    const totalMeals = durationDays * mealsPerDay;
    const totalPrice = Math.round(totalMeals * basePrice * (1 - discount));

    let subscriptionStatus: "active" | "pending" = "pending";
    let transactionId: string | undefined;
    let paymentResponse: any = null;

    // ---------------- WALLET PAYMENT ----------------
    if (paymentMethod === "wallet") {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || wallet.balance < totalPrice)
        return res.status(400).json({ message: "Insufficient wallet balance" });

      const balanceBefore = wallet.balance;
      wallet.balance -= totalPrice;
      wallet.totalSpent += totalPrice;
      await wallet.save();

      await new WalletHistory({
        userId,
        walletId: wallet._id,
        type: "payment",
        amount: totalPrice,
        currency: "KWD", // updated currency
        balanceBefore,
        balanceAfter: wallet.balance,
        description: "Subscription payment",
        status: "completed",
      }).save();

      subscriptionStatus = "active";
      transactionId = `WALLET_${Date.now()}`;

      const walletMsg = `Your subscription payment of ${totalPrice} KWD using wallet is completed.`;
      io.to(userId.toString()).emit("payment_notification", {
        message: walletMsg,
        amount: totalPrice,
        paymentMethod: "wallet",
      });
      await createUserNotification(userId, "Payment Success", walletMsg, "inApp");
    }

    // ---------------- CREATE SUBSCRIPTION ----------------
    const subscription = new Subscription({
      userId,
      planType,
      planName: `${durationDays}-day plan`,
      startDate,
      endDate: new Date(new Date(startDate).getTime() + durationDays * 86400000),
      mealsPerDay,
      totalMeals,
      price: totalPrice,
      status: subscriptionStatus,
      autoRenew,
      meals: [],
      payment: {
        gateway: paymentMethod,
        status: subscriptionStatus,
        amountPaid: subscriptionStatus === "active" ? totalPrice : 0,
        currency: "KWD", // updated currency
      },
    });
    await subscription.save();

    // ---------------- STRIPE PAYMENT ----------------
    if (paymentMethod === "stripe") {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalPrice * 100,
        currency: "KWD", // updated currency
        metadata: { subscriptionId: subscription.id.toString(), userId },
      });
      transactionId = paymentIntent.id;
      paymentResponse = paymentIntent;
      subscriptionStatus = "pending";
    }

    // ---------------- CASH ON DELIVERY (COD) ----------------
    if (paymentMethod === "cod") {
      subscriptionStatus = "pending"; // COD subscription remains pending until payment collected
      transactionId = `COD_${Date.now()}`;
    }

    // ---------------- SAVE PAYMENT ----------------
    const paymentRecord = await new Payment({
      userId,
      subscriptionId: subscription._id,
      amount: totalPrice,
      currency: "KWD", // updated currency
      gateway: paymentMethod,
      status: subscriptionStatus === "active" ? "completed" : "pending",
      transactionId,
    }).save();

    // ---------------- CREATE DAILY MEALS & ORDERS ----------------
    const orders = [];

    for (let day = 0; day < durationDays; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);

      const dailyMeals: any = { date, isLocked: day >= 3, status: "pending" };
      const orderMeals: any[] = [];

      for (let slot = 0; slot < mealsPerDay; slot++) {
        const selection = mealSelections[slot];
        if (!selection) continue;

        const product = await ProductModel.findById(selection.productId);
        if (!product) continue;

        dailyMeals[selection.mealType] = product._id;
        orderMeals.push({ slot: selection.mealType, productId: product._id, status: "scheduled" });
      }

      subscription.meals.push(dailyMeals);
      orders.push({
        subscriptionId: subscription._id,
        userId,
        date,
        meals: orderMeals,
        status: subscriptionStatus === "active" ? "scheduled" : "pending", // COD pending
      });
    }

    await subscription.save();
    await DailyOrder.insertMany(orders);

    res.status(200).json({
      success: true,
      subscription,
      payment: paymentRecord,
      paymentResponse,
      message: paymentMethod === "cod" ? "Subscription created. Pay on delivery." : "Subscription created successfully."
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create subscription", error: err });
  }
};



// -------------------- STRIPE WEBHOOK --------------------
export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"]!;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error(err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle payment events
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const subscriptionId = paymentIntent.metadata.subscriptionId;
    const userId = paymentIntent.metadata.userId;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    // Update subscription status
    subscription.status = "active";
    subscription.payment.status = "completed";
    subscription.payment.amountPaid = paymentIntent.amount / 100;
    await subscription.save();

    // Record payment
    const paymentRecord = await new Payment({
      userId,
      subscriptionId,
      amount: paymentIntent.amount / 100,
      currency: "INR",
      gateway: "stripe",
      status: "completed",
      transactionId: paymentIntent.id,
    }).save();

    // ---------------- PAYMENT NOTIFICATION ----------------
    const msg = `Your payment of ₹${paymentRecord.amount} via Stripe is completed successfully.`;
    
    // Emit real-time notification via Socket.IO
    io.to(userId.toString()).emit("payment_notification", { message: msg, payment: paymentRecord });

    // Save notification in database
    await createUserNotification(
      userId.toString(),
      "Payment Success",
      msg,
      "inApp" // optional channel
    );
  }

  res.json({ received: true });
};


// -------------------- SUBSCRIPTION CONTROLS --------------------
// Pause subscription
export const pauseSubscription = async (req: Request, res: Response) => {
  const sub = await Subscription.findById(req.params.subscriptionId);
  // console.log(sub);
  if (!sub) return res.status(404).json({ message: "Subscription not found" });

  sub.isPaused = true;
   sub.status="paused";
  await sub.save();

  const msg = `Your subscription "${sub.planName}" has been paused.`;
  io.to(sub.userId.toString()).emit("subscription_notification", { message: msg });
  await createUserNotification(sub.userId.toString(), "Subscription Paused", msg, "inApp");

  res.json({ success: true, subscription: sub });
};


// Resume subscription
export const resumeSubscription = async (req: Request, res: Response) => {
  const sub = await Subscription.findById(req.params.subscriptionId);
  if (!sub) return res.status(404).json({ message: "Subscription not found" });

  sub.isPaused = false;
   sub.status="resumed";
  await sub.save();

  const msg = `Your subscription "${sub.planName}" has been resumed.`;
  io.to(sub.userId.toString()).emit("subscription_notification", { message: msg });
  await createUserNotification(sub.userId.toString(), "Subscription Resumed", msg, "inApp");

  res.json({ success: true, subscription: sub });
};


export const cancelSubscription = async (req: Request, res: Response) => {
  const sub = await Subscription.findById(req.params.subscriptionId);
  if (!sub) return res.status(404).json({ message: "Subscription not found" });

  sub.status = "cancelled";
  await sub.save();

  const msg = `Your subscription "${sub.planName}" has been cancelled.`;
  io.to(sub.userId.toString()).emit("subscription_notification", { message: msg });
  await createUserNotification(sub.userId.toString(), "Subscription Cancelled", msg, "inApp");

  res.json({ success: true, subscription: sub });
};

// Freeze subscription
export const freezeSubscription = async (req: Request, res: Response) => {
  const sub = await Subscription.findById(req.params.subscriptionId);
  if (!sub) return res.status(404).json({ message: "Subscription not found" });

  sub.isFrozen = true;
  sub.status="freeze";
  await sub.save();

  const msg = `Your subscription "${sub.planName}" has been frozen.`;
  io.to(sub.userId.toString()).emit("subscription_notification", { message: msg });
  await createUserNotification(sub.userId.toString(), "Subscription Frozen", msg, "inApp");

  res.json({ success: true, subscription: sub });
};

// Deliver meal
export const deliverMeal = async (req: Request, res: Response) => {
  const sub = await Subscription.findById(req.params.subscriptionId);
  if (!sub) return res.status(404).json({ message: "Subscription not found" });

  sub.lastDeliveredAt = new Date();
  await sub.save();

  const msg = `Your meal for subscription "${sub.planName}" has been delivered. Enjoy!`;
  io.to(sub.userId.toString()).emit("meal_notification", { message: msg });
  await createUserNotification(sub.userId.toString(), "Meal Delivered", msg, "inApp");

  res.json({ success: true, subscription: sub });
};


// Swap meal
export const swapMeal = async (req: Request, res: Response) => {
  const { subscriptionId } = req.params;
  const { date, slot } = req.body;
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

  const dailyOrder = await DailyOrder.findOne({ subscriptionId, date: { $gte: dayStart, $lte: dayEnd } });
  if (!dailyOrder) return res.status(404).json({ message: "Daily order not found" });

  const mealIndex = dailyOrder.meals.findIndex((m) => m.slot === slot);
  if (mealIndex === -1) return res.status(400).json({ message: "Meal slot not found" });

  let mealsList: any[] = mealCache.get(`meals_${slot}`) || [];
  if (!mealsList.length) { mealsList = await ProductModel.find({ type: slot, isActive: true }); mealCache.set(`meals_${slot}`, mealsList); }
  if (!mealsList.length) return res.status(404).json({ message: "No meals available to swap" });

  const currentMealId = dailyOrder.meals[mealIndex].productId.toString();
  const filteredMeals = mealsList.filter((meal) => meal._id.toString() !== currentMealId);
  if (!filteredMeals.length) return res.status(400).json({ message: "No alternative meals available" });

  dailyOrder.meals[mealIndex].productId = filteredMeals[Math.floor(Math.random() * filteredMeals.length)]._id;
  await dailyOrder.save();
  res.json({ success: true, dailyOrder });
};

// Get subscription by ID
export const getSubscriptionById = async (req: Request, res: Response) => {
  const sub = await Subscription.findById(req.params.subscriptionId);
  if (!sub) return res.status(404).json({ message: "Subscription not found" });
  res.json({ success: true, subscription: sub });
};
export const getSubscriptionPayments = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId || !mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({ success: false, message: "Invalid subscription ID" });
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    const payments = await Payment.find(
      { subscriptionId },
      "amount status createdAt gateway transactionId"
    ).lean();

    res.json({ success: true, payments });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch payments",
    });
  }
};

// Get all subscriptions

export const getAllSubscriptions = async (_req: Request, res: Response) => {
  try {
    // Step 1: Fetch all subscriptions with user populated
    const subs = await Subscription.find()
      .populate("userId", "username email")
      .populate("meals.breakfast meals.lunch meals.dinner") // populate meal products
      .lean();

    // Step 2: Fetch payments for all subscriptionIds
    const subIds = subs.map((s) => s._id);
    const payments = await Payment.find(
      { subscriptionId: { $in: subIds } },
      "amount status createdAt gateway transactionId subscriptionId"
    ).lean();

    // Step 3: Group payments by subscriptionId
    const paymentsBySub: Record<string, any[]> = {};
    payments.forEach((p) => {
      const key = p.subscriptionId.toString();
      if (!paymentsBySub[key]) paymentsBySub[key] = [];
      paymentsBySub[key].push(p);
    });

    // Step 4: Merge payments into subscriptions
   interface IUserPopulated {
  _id: string;
  username: string;
  email: string;
}

const enriched = subs.map((sub) => {
  let user: IUserPopulated | { _id: string } | null = null;

  // Type guard to check if userId is populated
  if (sub.userId) {
    if (typeof sub.userId === "object" && "username" in sub.userId && "email" in sub.userId) {
      user = { 
        _id: (sub.userId as any)._id.toString(), 
        username: (sub.userId as any).username, 
        email: (sub.userId as any).email 
      };
    } else {
      user = { _id: sub.userId.toString() };
    }
  }

  const mealsWithDetails = sub.meals.map((meal: any) => ({
    date: meal.date,
    breakfast: meal.breakfast
      ? { _id: meal.breakfast._id, name: meal.breakfast.name, price: meal.breakfast.price }
      : null,
    lunch: meal.lunch
      ? { _id: meal.lunch._id, name: meal.lunch.name, price: meal.lunch.price }
      : null,
    dinner: meal.dinner
      ? { _id: meal.dinner._id, name: meal.dinner.name, price: meal.dinner.price }
      : null,
    isLocked: meal.isLocked,
    status: meal.status,
  }));

  return {
    ...sub,
    user,
    meals: mealsWithDetails,
    payments: paymentsBySub[sub._id.toString()] || [],
  };
});



    res.json({ success: true, subscriptions: enriched });
  } catch (err: any) {
    console.error("Error fetching subscriptions:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch subscriptions",
    });
  }
};

// Get subscriptions by user

// Add this validation helper
const isValidObjectId = (id: string) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Example usage in your controllers:
export const getSubscriptionsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid user ID format" 
      });
    }
    
    const subs = await Subscription.find({ userId }).sort({ startDate: -1 });
    if (!subs.length) {
      return res.status(404).json({ 
        success: false, 
        message: "No subscriptions found" 
      });
    }
    
    res.json({ success: true, subscriptions: subs });
  } catch (error: any) {
    console.error("Error fetching user subscriptions:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch subscriptions",
      error: error.message 
    });
  }
};
// Update subscription
export const updateSubscription = async (req: Request, res: Response) => {
  const updated = await Subscription.findByIdAndUpdate(req.params.subscriptionId, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: "Subscription not found" });
  res.json({ success: true, subscription: updated });
};

// Delete subscription
export const deleteSubscription = async (req: Request, res: Response) => {
  const deleted = await Subscription.findByIdAndDelete(req.params.subscriptionId);
  if (!deleted) return res.status(404).json({ message: "Subscription not found" });
  res.json({ success: true, message: "Subscription deleted" });
};

// Get subscription stats
export const getSubscriptionStats = async (req: Request, res: Response) => {
  const sub = await Subscription.findById(req.params.subscriptionId);
  if (!sub) return res.status(404).json({ message: "Subscription not found" });

  const dailyOrdersCount = await DailyOrder.countDocuments({ subscriptionId: sub._id });
  res.json({ success: true, stats: { totalMeals: sub.totalMeals, dailyOrdersCount } });
};

// Get all stats
export const getAllStats = async (_req: Request, res: Response) => {
  const totalSubscriptions = await Subscription.countDocuments();
  const sub=await Subscription.find();
  const activeSubscriptions = await Subscription.countDocuments({ status: "active" });
  res.json({ success: true, stats: { totalSubscriptions, activeSubscriptions ,subscription:sub} });
};


export const createSubscriptionAdmin = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const { 
      durationDays, 
      mealsPerDay, 
      startDate, 
      planType, 
      planName, 
      price, 
      meals // meals array with structure [{ date, breakfast, lunch, dinner }]
    } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: "userId is required" });
    if (!startDate) return res.status(400).json({ success: false, message: "startDate is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const start = new Date(startDate);
    if (isNaN(start.getTime())) return res.status(400).json({ success: false, message: "Invalid startDate" });

    const duration = Number(durationDays);
    const mealsCount = Number(mealsPerDay);
    if (isNaN(duration) || isNaN(mealsCount)) return res.status(400).json({ success: false, message: "Invalid durationDays or mealsPerDay" });

    // Prepare meals array if provided
    let mealSchedule = [];
    if (meals && Array.isArray(meals)) {
      for (const m of meals) {
        const breakfast = m.breakfast ? await ProductModel.findById(m.breakfast) : null;
        const lunch = m.lunch ? await ProductModel.findById(m.lunch) : null;
        const dinner = m.dinner ? await ProductModel.findById(m.dinner) : null;

        mealSchedule.push({
          date: new Date(m.date),
          breakfast: breakfast?._id || null,
          lunch: lunch?._id || null,
          dinner: dinner?._id || null,
          isLocked: false,
          status: "pending"
        });
      }
    } else {
      // Auto-generate meal schedule if meals not provided
      for (let i = 0; i < duration; i++) {
        const mealDate = new Date(start.getTime() + i * 86400000);
        mealSchedule.push({
          date: mealDate,
          breakfast: null,
          lunch: null,
          dinner: null,
          isLocked: false,
          status: "pending"
        });
      }
    }

    const subscription = new Subscription({
      userId,
      planType: planType || "basic",
      planName: planName || `${duration}-day plan`,
      startDate: start,
      endDate: new Date(start.getTime() + duration * 86400000),
      mealsPerDay: mealsCount,
      totalMeals: duration * mealsCount,
      price: price || 0,
      status: "active",
      autoRenew: false,
      meals: mealSchedule,
      consumedMeals: 0,
      remainingMeals: duration * mealsCount,
      deliveredMeals: 0,
      pendingDeliveries: duration * mealsCount,
    });

    await subscription.save();

    res.status(200).json({ success: true, message: "Admin subscription created", subscription });

  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create subscription", error: err.message });
  }
};



export const handlePaymentWebhook = async (req: Request, res: Response) => {
  try {
    const { subscriptionId, status, amountPaid, gateway, transactionId } = req.body;

    if (!subscriptionId || !status || !gateway) {
      return res.status(400).json({ success: false, message: "Missing required webhook fields" });
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) return res.status(404).json({ success: false, message: "Subscription not found" });

    // Update subscription payment info
    subscription.status = status === "completed" ? "active" : subscription.status;
    subscription.payment = {
      gateway,
      status,
      amountPaid: amountPaid || subscription.payment.amountPaid || 0,
      currency: "INR",
      discountApplied: 0,
      balanceRemaining:0
    };
    await subscription.save();

    // Record payment
    const paymentRecord = await new Payment({
      userId: subscription.userId,
      subscriptionId: subscription._id,
      amount: amountPaid || 0,
      currency: "INR",
      gateway,
      status,
      transactionId: transactionId || `GEN_${Date.now()}`,
    }).save();

    // ---------------- PAYMENT NOTIFICATION ----------------
    const msg = `Your payment of ₹${paymentRecord.amount} via ${gateway} is ${status}.`;

// Emit real-time notification via Socket.IO
io.to(subscription.userId.toString()).emit("payment_notification", {
  message: msg,
  payment: paymentRecord,
});

// Save notification in the database
await createUserNotification(
  subscription.userId.toString(),    // user ID
  "Payment Success",      // title
  msg,                    // message (I changed 'wallet' to msg to match your notification)
  "inApp"                 // optional channel
);

    res.status(200).json({ success: true, message: "Webhook processed", subscription, payment: paymentRecord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to process webhook", error: err });
  }
};

const getSetting = async <T>(key: string, defaultValue: T): Promise<T> => {
  const setting = await SystemSettings.findOne({ key });
  return setting ? (setting.value as T) : defaultValue;
};

/**
 * CREATE SUBSCRIPTION
 */
export const createSubscription = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      userId,
      planDuration,
      mealsPerDay,
      startDate,
      mealPreferences,
      planType,
      paymentMethodId,
    } = req.body;

    const user = await User.findById(userId).session(session);
    if (!user) return res.status(401).json({ message: "User not found" });

    if (!planDuration || !mealsPerDay || !startDate)
      return res.status(400).json({ message: "Missing required fields" });

    const productsQuery: any = { isActive: true };
    if (mealPreferences?.length) productsQuery.mealType = { $in: mealPreferences };
    const products = await ProductModel.find(productsQuery).session(session);
    if (!products.length) return res.status(400).json({ message: "No matching products found" });

    let totalPrice = 0;
    const defaultMeals: Types.ObjectId[] = [];
    for (let i = 0; i < planDuration; i++) {
      for (let j = 0; j < mealsPerDay; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        defaultMeals.push(product._id as Types.ObjectId);
        totalPrice += product.price;
      }
    }

    const discounts = await getSetting<{ [key: string]: number }>("subscription.discountSlabs", {
      "7": 2,
      "14": 5,
      "28": 10,
    });
    if (discounts[planDuration]) totalPrice *= (100 - discounts[planDuration]) / 100;

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: user.username,
        email: user.email,
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save({ session });
    }

    const amount = Math.round(totalPrice * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "inr",
      payment_method: paymentMethodId,
      customer: stripeCustomerId,
      confirm: true,
      off_session: true,
      metadata: { userId: user.id.toString(), planDuration: planDuration.toString() },
    });

    const payment = await PaymentModel.create(
      [
        {
          userId,
          subscriptionId: null,
          amount: totalPrice,
          currency: "INR",
          gateway: "stripe",
          status: paymentIntent.status === "succeeded" ? "completed" : "pending",
          transactionId: paymentIntent.id,
        },
      ],
      { session }
    );

    const subscription = await Subscription.create(
      [
        {
          userId,
          planType: planType || "basic",
          planName: `${planDuration}-Day Plan`,
          startDate,
          endDate: new Date(new Date(startDate).setDate(new Date(startDate).getDate() + planDuration - 1)),
          mealsPerDay,
          totalMeals: planDuration * mealsPerDay,
          consumedMeals: 0,
          remainingMeals: planDuration * mealsPerDay,
          price: totalPrice,
          currency: "INR",
          billingCycle: "monthly",
          autoRenew: true,
          payment: {
            gateway: "stripe",
            status: paymentIntent.status === "succeeded" ? "paid" : "pending",
            amountPaid: totalPrice,
            currency: "INR",
            transactionId: paymentIntent.id,
          },
          meals: Array.from({ length: planDuration }, (_, i) => {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            return Array.from({ length: mealsPerDay }, (_, slot) => ({
              date,
              isLocked: i >= 3,
            }));
          }).flat(),
        },
      ],
      { session }
    );

    await PaymentModel.findByIdAndUpdate(payment[0]._id, { subscriptionId: subscription[0]._id }, { session });

    const orders = [];
    for (let i = 0; i < planDuration; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const meals = [];
      for (let slot = 0; slot < mealsPerDay; slot++) {
        const productIndex = i * mealsPerDay + slot;
        meals.push({
          slot: mealsPerDay === 2 ? (slot === 0 ? "lunch" : "dinner") : slot === 0 ? "breakfast" : slot === 1 ? "lunch" : "dinner",
          productId: defaultMeals[productIndex],
          status: "scheduled",
        });
      }
      orders.push({ subscriptionId: subscription[0]._id, userId, date, meals });
    }
    await DailyOrder.insertMany(orders, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      subscription: subscription[0],
      totalPrice,
      payment: payment[0],
      message: "Subscription created & payment captured successfully",
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Subscription creation error:", error);
    res.status(500).json({ message: "Error creating subscription", error: error.message });
  }
};

/**
 * PAUSE / RESUME SUBSCRIPTION
 */
export const toggleSubscriptionStatus = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { action } = req.body;
    const maxPauseTimes = await getSetting<number>("subscription.maxPauseTimes", 2);

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    if (action === "pause") {
      if ((subscription.pauseCount || 0) >= maxPauseTimes)
        return res.status(400).json({ message: "Pause limit reached" });
      subscription.isPaused = true;
      subscription.pauseCount = (subscription.pauseCount || 0) + 1;
    } else {
      subscription.isPaused = false;
    }
    if(action==="cancel"){
      subscription.status="cancelled"
    }
    if(action==="delivered"){
      subscription.status="delivered"
      
    }
    if(action==="freeze"){
      subscription.status="freeze"
      subscription.isFrozen=true;
    }
    if(action==="resume"){
      subscription.status="resumed"
    }
    if(action=="swap"){
      subscription.status="swappable"
      
    }

    await subscription.save();
    res.json({ subscription, message: `Subscription ${action}d successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error updating subscription", error });
  }
};

/**
 * REFUND PROCESSING
 */
export const processRefund = async (req: Request, res: Response) => {
  try {
    const { subscriptionId, reason } = req.body;
    const refundPolicy = await getSetting<{ type: string; graceDays: number }>("subscription.refundPolicy", {
      type: "partial",
      graceDays: 3,
    });

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    let refundAmount = 0;
    const daysConsumed = subscription.completedDays || 0;

    if (refundPolicy.type === "full" && daysConsumed <= refundPolicy.graceDays) {
      refundAmount = subscription.price;
    } else if (refundPolicy.type === "partial") {
      const unusedMeals = subscription.totalMeals - subscription.consumedMeals;
      refundAmount = (unusedMeals / subscription.totalMeals) * subscription.price;
    }

    subscription.status = "refunded";
    subscription.refundAmount = refundAmount;
    subscription.refundReason = reason;
    await subscription.save();

    if (subscription.payment?.transactionId) {
      await stripe.refunds.create({ payment_intent: subscription.payment.transactionId });
    }

    res.json({ subscription, message: `Refund processed: ₹${refundAmount}` });
  } catch (error) {
    res.status(500).json({ message: "Error processing refund", error });
  }
};

/**
 * LOCK MEALS AFTER CHANGE WINDOW
 */
export const lockMealsAfterChangeWindow = async () => {
  try {
    // Fetch setting from DB or fallback to default 3 days
    const changeWindowDays = await getSetting<number>("subscription.changeWindowDays", 3);

    // Get all active subscriptions
    const subscriptions = await Subscription.find({ status: { $in: ["active", "paused"] } });

    const now = new Date();

    for (const sub of subscriptions) {
      // Calculate lock date (start date + change window)
      const lockDate = new Date(sub.startDate);
      lockDate.setDate(lockDate.getDate() + changeWindowDays);

      // If current date > lockDate, lock all meals for this subscription
      if (now > lockDate) {
        await DailyOrder.updateMany(
          { subscriptionId: sub._id },
          { $set: { "meals.$[].locked": true } }
        );
      }
    }

    console.log(`✅ Meal lock job executed. Checked ${subscriptions.length} subscriptions.`);
  } catch (error) {
    console.error("❌ Error locking meals after change window:", error);
  }
};

/**
 * AUTO-RENEW SUBSCRIPTIONS (CRON)
 */
export const autoRenewSubscriptions = async () => {
  try {
    const autoRenewEnabled = await getSetting<boolean>("subscription.autoRenewEnabled", true);
    if (!autoRenewEnabled) return;

    const expiringSubs = await Subscription.find({
      endDate: { $lte: new Date() },
      autoRenew: true,
      status: "active",
    });

    for (const sub of expiringSubs) {
      try {
        if (!sub.userId) continue;
        const user = await User.findById(sub.userId);
        if (!user || !user.stripeCustomerId || !user.stripePaymentMethodId) continue;

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(sub.price * 100),
          currency: "inr",
          customer: user.stripeCustomerId,
          payment_method: user.stripePaymentMethodId,
          off_session: true,
          confirm: true,
          metadata: { subscriptionId: sub.id.toString() },
        });

        if (paymentIntent.status === "succeeded") {
          sub.startDate = new Date();
          sub.endDate = new Date(new Date().setDate(new Date().getDate() + (sub.durationDays || 7)));
          await sub.save();
        }
      } catch (err) {
        console.error("Auto-renewal failed:", err);
      }
    }
  } catch (error) {
    console.error("Error in auto renewal:", error);
  }
};

/**
 * SYSTEM SETTINGS CRUD
 */
export const upsertSetting = async (req: Request, res: Response) => {
  try {
    const { key, value, description, category } = req.body;
    const setting = await SystemSettings.findOneAndUpdate(
      { key },
      { value, description, category },
      { new: true, upsert: true }
    );
    res.json({ message: "Setting saved successfully", setting });
  } catch (error) {
    res.status(500).json({ message: "Error saving setting", error });
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const settings = await SystemSettings.find(filter);
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ message: "Error fetching settings", error });
  }
};

export const deleteSetting = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const result = await SystemSettings.findOneAndDelete({ key });
    if (!result) return res.status(404).json({ message: "Setting not found" });
    res.json({ message: "Setting deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting setting", error });
  }
};








// Add these interfaces at the top of your file
interface MealSelection {
  date: string;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
}

interface CreateSubscriptionWithMealSelectionRequest {
  planDuration: number;
  startDate: string;
  mealSelections: MealSelection[];
  planType?: string;
  paymentMethod?: string;
  paymentMethodId?: string;
}

export const createSubscriptionWithMealSelection = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.params.userId;
    const {
      planDuration,
      startDate,
      mealSelections,
      planType,
      paymentMethod,
      paymentMethodId,
    }: CreateSubscriptionWithMealSelectionRequest = req.body;

    if (!planDuration || !startDate || !mealSelections) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (mealSelections.length !== planDuration) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Meal selections length must match plan duration",
      });
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "User not found" });
    }

    // ---------------- Meal Cost Calculation ----------------
    let totalCostPrice = 0;
    let totalPrice = 0;
    const mealDetailsByDay: { date: Date; meals: any[] }[] = [];

    for (const day of mealSelections) {
      const dayMeals: any[] = [];
      const slots = ["breakfast", "lunch", "dinner"] as const;

      for (const slot of slots) {
        const productId = (day as any)[slot];
        if (!productId) continue;

        const product = await ProductModel.findById(productId).session(session);
        if (!product || !product.isActive) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ message: `Invalid or inactive product for ${slot} on ${day.date}` });
        }

        const costPrice = product.costPrice ?? 0;
        const price = product.price ?? costPrice;

        totalCostPrice += costPrice;
        totalPrice += price;

        dayMeals.push({
          slot,
          productId: product._id,
          productDetails: {
            name: product.name,
            description: product.description,
            costPrice,
            price,
            mealType: product.mealType,
          },
          status: "scheduled",
        });
      }

      mealDetailsByDay.push({ date: new Date(day.date), meals: dayMeals });
    }

    // ---------------- Discount ----------------
    const discountSlabs = await getSetting<{ [key: string]: number }>(
      "subscription.discountSlabs",
      { "7": 2, "14": 5, "28": 10 }
    );
    const discountPercent = discountSlabs[planDuration.toString()] || 0;
    const discountedTotalPrice = parseFloat((totalPrice * ((100 - discountPercent) / 100)).toFixed(2));
    const totalProfit = discountedTotalPrice - totalCostPrice;

    // ---------------- Create Subscription ----------------
    const subscription = new Subscription({
      userId,
      planType: planType || "basic",
      planName: `${planDuration}-Day Custom Plan`,
      startDate: new Date(startDate),
      endDate: new Date(new Date(startDate).setDate(new Date(startDate).getDate() + planDuration - 1)),
      mealsPerDay: Math.max(...mealDetailsByDay.map(d => d.meals.length)),
      totalMeals: mealDetailsByDay.reduce((acc, day) => acc + day.meals.length, 0),
      consumedMeals: 0,
      remainingMeals: mealDetailsByDay.reduce((acc, day) => acc + day.meals.length, 0),
      price: discountedTotalPrice,
      totalCost: totalCostPrice,
      totalProfit,
      currency: "KWD",
      billingCycle: planDuration === 7 ? "weekly" : planDuration === 14 ? "2-weeks" : "monthly",
      autoRenew: false,
      status: "pending",
      payment: {
        gateway: paymentMethod || "manual",
        status: "pending",
        amountPaid: 0,
        currency: "KWD",
        discountApplied: discountPercent,
      },
      meals: mealDetailsByDay.map(day => ({
        date: day.date,
        breakfast: day.meals.find(m => m.slot === "breakfast")?.productId,
        lunch: day.meals.find(m => m.slot === "lunch")?.productId,
        dinner: day.meals.find(m => m.slot === "dinner")?.productId,
        isLocked: false,
        status: "scheduled",
      })),
    });

    const subscriptionDoc = await subscription.save({ session });

    // ---------------- Create Daily Orders ----------------
    const dailyOrders = mealDetailsByDay.map(day => {
      let totalPricePerDay = 0;
      let totalCostPricePerDay = 0;

      const mealsWithPrices = day.meals.map(meal => {
        const price = meal.productDetails.price ?? 0;
        const costPrice = meal.productDetails.costPrice ?? 0;
        totalPricePerDay += price;
        totalCostPricePerDay += costPrice;
        return { ...meal, price, costPrice };
      });

      return {
        subscriptionId: subscriptionDoc._id,
        userId,
        date: day.date,
        meals: mealsWithPrices,
        totalPrice: totalPricePerDay,
        totalCost: totalCostPricePerDay,
        status: "scheduled",
      };
    });

    await DailyOrder.insertMany(dailyOrders, { session });

    // ---------------- Payment Handling ----------------
    let paymentRecord = null;
    let chargedPaymentIntentId: string | null = null;

    try {
      if (paymentMethod === "stripe" && paymentMethodId) {
        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({ name: user.username, email: user.email });
          stripeCustomerId = customer.id;
          user.stripeCustomerId = stripeCustomerId;
          await user.save({ session });
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(discountedTotalPrice * 100),
          currency: "KWD",
          payment_method: paymentMethodId,
          customer: stripeCustomerId,
          confirm: true,
          off_session: true,
          metadata: { subscriptionId: subscriptionDoc.id.toString(), userId: user.id.toString() }
        });

        chargedPaymentIntentId = paymentIntent.id;

        paymentRecord = await PaymentModel.create([{
          userId,
          subscriptionId: subscriptionDoc._id,
          amount: discountedTotalPrice,
          currency: "KWD",
          gateway: "stripe",
          status: paymentIntent.status === "succeeded" ? "completed" : "pending",
          transactionId: paymentIntent.id,
        }], { session });

        if (paymentIntent.status === "succeeded") {
          subscriptionDoc.payment.status = "completed";
          subscriptionDoc.payment.amountPaid = discountedTotalPrice;
          subscriptionDoc.status = "active";
          await subscriptionDoc.save({ session });
        } else {
          throw new Error(`Payment failed with status: ${paymentIntent.status}`);
        }
      }

      if (paymentMethod === "cod") {
        paymentRecord = await PaymentModel.create([{
          userId,
          subscriptionId: subscriptionDoc._id,
          amount: discountedTotalPrice,
          currency: "KWD",
          gateway: "cod",
          status: "pending",
        }], { session });
        subscriptionDoc.payment.status = "pending";
        subscriptionDoc.payment.gateway = "cod";
        subscriptionDoc.status = "pending";
        await subscriptionDoc.save({ session });
      }

    } catch (paymentError: any) {
      // ---------------- Payment failed: refund or abort ----------------
      console.error("Payment Error:", paymentError);

      if (chargedPaymentIntentId) {
        try {
          await stripe.refunds.create({ payment_intent: chargedPaymentIntentId });
          console.log("Refund issued for failed payment:", chargedPaymentIntentId);
        } catch (refundError) {
          console.error("Refund failed:", refundError);
        }
      }

      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Payment failed, subscription not created, amount refunded if charged.",
        error: paymentError.message,
      });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      subscription: subscriptionDoc,
      totalCost: totalCostPrice,
      totalPrice: discountedTotalPrice,
      totalProfit,
      discountApplied: discountPercent,
      payment: paymentRecord,
      message: "Custom meal subscription created successfully",
    });

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Custom subscription creation error:", error);
    return res.status(500).json({ success: false, message: "Error creating custom meal subscription", error: error.message });
  }
};





export const paySubscriptionAmount = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let chargedPaymentIntentId: string | null = null;

  try {
    const { subscriptionId } = req.params;
    let { amount, userId, paymentMethod, paymentMethodId } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    amount = parseFloat(parseFloat(amount).toFixed(2));

    const subscription = await Subscription.findById(subscriptionId).session(session);
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    const user = await User.findById(userId).session(session);
    if (!user) return res.status(404).json({ message: "User not found" });

    const discountApplied = subscription.payment.discountApplied || 0;
    const totalPayable = parseFloat((subscription.price * (1 - discountApplied / 100)).toFixed(2));
    const remainingToPay = parseFloat((totalPayable - subscription.payment.amountPaid).toFixed(2));
    if (remainingToPay <= 0) {
      return res.status(400).json({ message: "Subscription already fully paid" });
    }

    const finalAmount = Math.min(amount, remainingToPay);
    let paymentRecord: any = null;

    // ---------------- Stripe Payment ----------------
    if (paymentMethod === "stripe") {
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          name: user.username,
          email: user.email,
        });
        stripeCustomerId = customer.id;
        user.stripeCustomerId = stripeCustomerId;
        await user.save({ session });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalAmount * 100),
        currency: "KWD",
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        metadata: {
          subscriptionId: subscription.id.toString(),
          userId: user.id.toString(),
          type: "subscription_payment",
        },
      });

      chargedPaymentIntentId = paymentIntent.id;

      paymentRecord = await PaymentModel.create(
        [
          {
            userId,
            subscriptionId: subscription._id,
            amount: finalAmount,
            currency: "KWD",
            gateway: "stripe",
            status: paymentIntent.status === "succeeded" ? "paid" : "pending",
            transactionId: paymentIntent.id,
          },
        ],
        { session }
      );

      if (paymentIntent.status !== "succeeded") {
        throw new Error(`Payment failed with status: ${paymentIntent.status}`);
      }
    }

    // ---------------- COD Payment ----------------
    else if (paymentMethod === "cod") {
      paymentRecord = await PaymentModel.create(
        [
          {
            userId,
            subscriptionId: subscription._id,
            amount: finalAmount,
            currency: "KWD",
            gateway: "cod",
            status: "pending",
          },
        ],
        { session }
      );
    } else {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    // ---------------- Update subscription ----------------
    subscription.payment.amountPaid = parseFloat(
      (subscription.payment.amountPaid + finalAmount).toFixed(2)
    );

    subscription.payment.balanceRemaining = parseFloat(
      Math.max(totalPayable - subscription.payment.amountPaid, 0).toFixed(2)
    );

    subscription.payment.status =
      subscription.payment.amountPaid >= totalPayable ? "completed" : "pending";
    subscription.status =
      subscription.payment.status === "completed" ? "active" : "pending";

    await subscription.save({ session });
    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      subscription,
      payment: paymentRecord[0],
      message: "Payment processed successfully",
    });
  } catch (error: any) {
    // ---------------- Refund if Stripe payment succeeded but failed afterward ----------------
    if (chargedPaymentIntentId) {
      try {
        await stripe.refunds.create({ payment_intent: chargedPaymentIntentId });
        console.log("Refund issued for failed payment:", chargedPaymentIntentId);
      } catch (refundError) {
        console.error("Refund failed:", refundError);
      }
    }

    await session.abortTransaction();
    console.error("Payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Payment failed, amount refunded if charged.",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};








