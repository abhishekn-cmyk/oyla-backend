// controllers/subscriptionController.ts
import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import Stripe from "stripe";

import User from "../models/User";
import Subscription from "../models/Subscription";
import { DailyOrder } from "../models/DailyOrder";
import ProductModel from "../models/Product";
import PaymentModel from "../models/Payment";
import SystemSettings from "../models/SystemSettings";
import { configDotenv } from "dotenv";
import { config } from "dotenv";
config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-08-27.basil" });

/**
 * UTILITY: GET SETTING WITH DEFAULT
 */
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
    const changeWindowDays = await getSetting<number>("subscription.changeWindowDays", 3);
    const subscriptions = await Subscription.find();

    for (const sub of subscriptions) {
      const lockDate = new Date(sub.startDate);
      lockDate.setDate(lockDate.getDate() + changeWindowDays);

      if (new Date() > lockDate) {
        await DailyOrder.updateMany(
          { subscriptionId: sub._id },
          { $set: { "meals.$[].locked": true } }
        );
      }
    }
  } catch (error) {
    console.error("Error locking meals:", error);
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
