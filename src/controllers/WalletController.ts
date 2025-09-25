import { Request, Response } from "express";
import { Wallet, WalletHistory } from "../models/Wallet";
import mongoose from "mongoose";

// Top-up wallet
export const topupWallet = async (req: Request, res: Response) => {
  try {
    const { userId, amount, description, paymentMethod } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) wallet = new Wallet({ userId, balance: 0 });

    const balanceBefore = wallet.balance;
    wallet.balance += amount;
    wallet.totalTopups += amount;
    await wallet.save();

    const history = new WalletHistory({
      userId,
      walletId: wallet._id,
      type: "topup",
      amount,
      currency: wallet.currency,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: description || "Wallet top-up",
      paymentMethod,
      status: "completed",
    });

    await history.save();

    res.status(200).json({ wallet, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

// Spend wallet (like payment)
export const spendWallet = async (req: Request, res: Response) => {
  try {
    const { userId, amount, description, orderId } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    if (wallet.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

    const balanceBefore = wallet.balance;
    wallet.balance -= amount;
    wallet.totalSpent += amount;
    await wallet.save();

    const history = new WalletHistory({
      userId,
      walletId: wallet._id,
      type: "payment",
      amount,
      currency: wallet.currency,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: description || "Wallet payment",
      orderId,
      status: "completed",
    });

    await history.save();

    res.status(200).json({ wallet, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

// Withdrawal from wallet
export const withdrawWallet = async (req: Request, res: Response) => {
  try {
    const { userId, amount, description, paymentMethod } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    if (wallet.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

    const balanceBefore = wallet.balance;
    wallet.balance -= amount;
    await wallet.save();

    const history = new WalletHistory({
      userId,
      walletId: wallet._id,
      type: "withdrawal",
      amount,
      currency: wallet.currency,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: description || "Wallet withdrawal",
      paymentMethod,
      status: "completed",
    });

    await history.save();

    res.status(200).json({ wallet, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

// Get wallet + recent transactions
export const getWallet = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const walletWithHistory = await Wallet.getWalletWithHistory(
      new mongoose.Types.ObjectId(userId),
      10
    );

    if (!walletWithHistory.length) return res.status(404).json({ message: "Wallet not found" });

    res.status(200).json(walletWithHistory[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

// Get current balance only
export const getWalletBalance = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    res.status(200).json({
      balance: wallet.balance,
      formattedBalance: wallet.formattedBalance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

// Get all wallet histories for all users
export const getAllWalletHistories = async (req: Request, res: Response) => {
  try {
    const histories = await WalletHistory.find({})
      .populate("userId", "name email") // populate user details
      .populate("walletId", "balance currency") // populate wallet details
      .sort({ transactionDate: -1 });

    res.status(200).json(histories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
};
