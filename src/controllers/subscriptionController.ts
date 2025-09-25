import { Request, Response } from "express";
import mongoose from "mongoose";
import Subscription from "../models/Subscription";
import User from "../models/User";
import { Wallet, WalletHistory } from "../models/Wallet";
export const getSubscriptionStats = async (req: Request, res: Response) => {
  const { subscriptionId } = req.params;
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return res.status(404).json({ message: "Subscription not found" });

  const stats = {
    totalMeals: sub.totalMeals,
    consumedMeals: sub.consumedMeals,
    deliveredMeals: sub.deliveredMeals,
    swappableMeals: sub.swappableMeals,
    frozenDays: sub.frozenDays,
    pendingDeliveries: sub.pendingDeliveries,
    remainingMeals: sub.remainingMeals,
    completedDays: sub.consumedMeals,
    pendingDays: sub.durationDays - sub.consumedMeals,
    penalty: Math.max(0, sub.price * ((sub.durationDays - sub.consumedMeals) / sub.durationDays)),
  };

  res.json({ subscription: sub, stats });
};

export const getAllStats = async (req: Request, res: Response) => {
  try {
    const total = await Subscription.countDocuments();

    // Count by status
    const statusCounts = await Subscription.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Active subscriptions overview
    const activeSubs = await Subscription.find({ status: "active" });

    const totalMeals = activeSubs.reduce((sum, s) => sum + s.totalMeals, 0);
    const consumedMeals = activeSubs.reduce((sum, s) => sum + s.consumedMeals, 0);
    const deliveredMeals = activeSubs.reduce((sum, s) => sum + s.deliveredMeals, 0);
    const swappableMeals = activeSubs.reduce((sum, s) => sum + s.swappableMeals, 0);
    const frozenDays = activeSubs.reduce((sum, s) => sum + s.frozenDays, 0);

    res.json({
      totalSubscriptions: total,
      statusCounts,
      activeSummary: {
        totalMeals,
        consumedMeals,
        deliveredMeals,
        swappableMeals,
        frozenDays,
        pendingMeals: totalMeals - consumedMeals,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
export const swapMeal = async (req: Request, res: Response) => {
  const { subscriptionId } = req.params;
  const { fromMeal, toMeal } = req.body;
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return res.status(404).json({ message: "Not found" });

  sub.swappableMeals++;
  sub.swapHistory.push({ date: new Date(), fromMeal, toMeal });
  await sub.save();

  res.json({ message: "Meal swapped", subscription: sub });
};

export const freezeSubscription = async (req: Request, res: Response) => {
  const { subscriptionId } = req.params;
  const { startDate, endDate, reason } = req.body;
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return res.status(404).json({ message: "Subscription not found" });

  const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  sub.frozenDays += days;
  sub.freezeHistory.push({ startDate, endDate, reason });
  sub.endDate = new Date(sub.endDate.getTime() + days * 86400000);
  sub.status = "freeze";
  await sub.save();

  res.json({ message: "Frozen", subscription: sub });
};

export const deliverMeal = async (req: Request, res: Response) => {
  const { subscriptionId } = req.params;
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return res.status(404).json({ message: "Subscription not found" });
  if (sub.remainingMeals <= 0) return res.status(400).json({ message: "No meals left" });

  sub.deliveredMeals++;
  sub.consumedMeals++;
  await sub.save();

  res.json({ message: "Meal delivered", subscription: sub });
};

// ---------------- CREATE SUBSCRIPTION (USER CHECKOUT) ----------------
export const checkoutSubscription = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { paymentMethod, price, currency, planType, planName, startDate, endDate, billingCycle, mealsPerDay, totalMeals, deliveryAddress, discountCode, discountAmount, externalPoints } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: "Invalid user ID" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    let walletHistory;
    if (paymentMethod === "wallet") {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || wallet.balance < price) return res.status(400).json({ message: "Insufficient wallet balance" });

      const balanceBefore = wallet.balance;
      wallet.balance -= price;
      wallet.totalSpent += price;
      await wallet.save();

      walletHistory = await new WalletHistory({
        userId,
        walletId: wallet._id,
        type: "payment",
        amount: price,
        currency: wallet.currency,
        balanceBefore,
        balanceAfter: wallet.balance,
        description: `Subscription payment`,
        status: "completed",
      }).save();
    }

    const subscription = new Subscription({
      userId,
      planType,
      planName,
      startDate,
      endDate,
      price,
      currency: currency || "INR",
      billingCycle,
      mealsPerDay,
      totalMeals,
      deliveryAddress,
      discountCode,
      discountAmount,
      externalPoints,
      status: paymentMethod === "wallet" ? "active" : "pending",
      payment: {
        gateway: paymentMethod === "wallet" ? "wallet" : req.body.payment?.gateway || "razorpay",
        status: paymentMethod === "wallet" ? "completed" : "pending",
        amountPaid: price,
        currency: currency || "INR",
      },
    });

    await subscription.save();

    res.status(201).json({
      message: "Subscription created",
      subscription,
      walletHistory: walletHistory || null,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------- ADMIN CREATES SUBSCRIPTION ----------------
export const createSubscription = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { paymentMethod, price, currency, planType, planName, startDate, endDate, billingCycle, mealsPerDay, totalMeals, deliveryAddress, discountCode, discountAmount, externalPoints } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    let walletHistory;
    if (paymentMethod === "wallet") {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || wallet.balance < price) return res.status(400).json({ message: "Insufficient wallet balance" });

      const balanceBefore = wallet.balance;
      wallet.balance -= price;
      wallet.totalSpent += price;
      await wallet.save();

      walletHistory = await new WalletHistory({
        userId,
        walletId: wallet._id,
        type: "payment",
        amount: price,
        currency: wallet.currency,
        balanceBefore,
        balanceAfter: wallet.balance,
        description: `Admin-created subscription payment`,
        status: "completed",
      }).save();
    }

    const subscription = new Subscription({
      userId,
      planType,
      planName,
      startDate,
      endDate,
      price,
      currency: currency || "INR",
      billingCycle,
      mealsPerDay,
      totalMeals,
      deliveryAddress,
      discountCode,
      discountAmount,
      externalPoints,
      status: paymentMethod === "wallet" ? "active" : "pending",
      payment: {
        gateway: paymentMethod === "wallet" ? "wallet" : "manual",
        status: paymentMethod === "wallet" ? "completed" : "pending",
        amountPaid: price,
        currency: currency || "INR",
      },
    });

    await subscription.save();

    res.status(201).json({
      message: "Subscription created successfully",
      subscription,
      walletHistory: walletHistory || null,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------- CANCEL SUBSCRIPTION (Refund to Wallet) ----------------
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { userId, subscriptionId } = req.params;
    const { reason } = req.body;

    const sub = await Subscription.findById(subscriptionId);
    if (!sub) return res.status(404).json({ message: "Subscription not found" });

    if (sub.userId.toString() !== userId) {
      return res.status(403).json({ message: "You cannot cancel someone else's subscription" });
    }

    const now = new Date();

    // Calculate days
    const totalDays =
      sub.durationDays ||
      Math.ceil((sub.endDate.getTime() - sub.startDate.getTime()) / (1000 * 60 * 60 * 24));

    const completedDays = Math.min(
      totalDays,
      Math.ceil((now.getTime() - sub.startDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    const pendingDays = totalDays - completedDays;

    // Calculate penalty = pendingDays × per-day price
    const perDayPrice = sub.price / totalDays;
    const penalty = perDayPrice * pendingDays;

    // Refund = total paid - penalty
    let refund = sub.price - penalty;
    refund = refund > 0 ? refund : 0;

    // Update subscription
    sub.status = "cancelled";
    sub.cancellationDate = now;
    sub.cancellationReason = reason || "User requested";
    sub.cancellationStatus = "pending";
    sub.completedDays = completedDays;
    sub.pendingDays = pendingDays;
    sub.penaltyAmount = penalty;
    sub.refundAmount = refund;

    // Wallet refund (only refund, not penalty)
    if (refund > 0) {
      const wallet = await Wallet.findOne({ userId: sub.userId });
      if (wallet) {
        const balanceBefore = wallet.balance;
        wallet.balance += refund;
        await wallet.save();

        await new WalletHistory({
          userId: sub.userId,
          walletId: wallet._id,
          type: "refund",
          amount: refund,
          currency: wallet.currency,
          balanceBefore,
          balanceAfter: wallet.balance,
          description: `Refund after ${penalty} KWD penalty for subscription cancellation`,
          status: "completed",
        }).save();
      }
    }

    if (sub.payment) sub.payment.status = "refunded";

    await sub.save();

    res.status(200).json({
      message: "Subscription cancelled with penalty applied",
      subscription: sub,
      breakdown: {
        totalDays,
        completedDays,
        pendingDays,
        perDayPrice,
        penalty,
        refund,
      },
    });
  } catch (err: any) {
    console.error("Error cancelling subscription:", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------- PAYMENT WEBHOOK ----------------
export const handlePaymentWebhook = async (req: Request, res: Response) => {
  try {
    const { subscriptionId, transactionId, amount, status } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    subscription.payment.status = status;
    subscription.payment.transactionId = transactionId;
    subscription.payment.paymentDate = new Date();
    subscription.payment.amountPaid = amount;

    await subscription.save();

    res.status(200).json({ message: "Payment updated", subscription });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- GET ALL SUBSCRIPTIONS (SuperAdmin) ----------------
export const getAllSubscriptions = async (_req: Request, res: Response) => {
  try {
    const subs = await Subscription.find()
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });
    res.status(200).json(subs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- GET USER SUBSCRIPTIONS ----------------
export const getSubscriptionsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: "Invalid user ID" });

    const subs = await Subscription.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(subs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- GET SUBSCRIPTION BY ID ----------------
export const getSubscriptionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sub = await Subscription.findById(id).populate("userId", "firstName lastName email");
    if (!sub) return res.status(404).json({ message: "Not found" });
    res.status(200).json(sub);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- UPDATE SUBSCRIPTION ----------------
export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params; // get from body
    if (!subscriptionId) return res.status(400).json({ message: "subscriptionId is required" });

    const sub = await Subscription.findByIdAndUpdate(subscriptionId, req.body, { new: true, runValidators: true });
    
    if (!sub) return res.status(404).json({ message: "Subscription not found" });

    res.status(200).json(sub);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- DELETE SUBSCRIPTION ----------------
export const deleteSubscription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sub = await Subscription.findByIdAndDelete(id);
    if (!sub) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ message: "Deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
