"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllWalletHistories = exports.getWalletBalance = exports.getWallet = exports.withdrawWallet = exports.spendWallet = exports.topupWallet = void 0;
const Wallet_1 = require("../models/Wallet");
const mongoose_1 = __importDefault(require("mongoose"));
// Top-up wallet
const topupWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, amount, description, paymentMethod } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ message: "Invalid amount" });
        let wallet = yield Wallet_1.Wallet.findOne({ userId });
        if (!wallet)
            wallet = new Wallet_1.Wallet({ userId, balance: 0 });
        const balanceBefore = wallet.balance;
        wallet.balance += amount;
        wallet.totalTopups += amount;
        yield wallet.save();
        const history = new Wallet_1.WalletHistory({
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
        yield history.save();
        res.status(200).json({ wallet, history });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err });
    }
});
exports.topupWallet = topupWallet;
// Spend wallet (like payment)
const spendWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, amount, description, orderId } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ message: "Invalid amount" });
        const wallet = yield Wallet_1.Wallet.findOne({ userId });
        if (!wallet)
            return res.status(404).json({ message: "Wallet not found" });
        if (wallet.balance < amount)
            return res.status(400).json({ message: "Insufficient balance" });
        const balanceBefore = wallet.balance;
        wallet.balance -= amount;
        wallet.totalSpent += amount;
        yield wallet.save();
        const history = new Wallet_1.WalletHistory({
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
        yield history.save();
        res.status(200).json({ wallet, history });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err });
    }
});
exports.spendWallet = spendWallet;
// Withdrawal from wallet
const withdrawWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, amount, description, paymentMethod } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ message: "Invalid amount" });
        const wallet = yield Wallet_1.Wallet.findOne({ userId });
        if (!wallet)
            return res.status(404).json({ message: "Wallet not found" });
        if (wallet.balance < amount)
            return res.status(400).json({ message: "Insufficient balance" });
        const balanceBefore = wallet.balance;
        wallet.balance -= amount;
        yield wallet.save();
        const history = new Wallet_1.WalletHistory({
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
        yield history.save();
        res.status(200).json({ wallet, history });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err });
    }
});
exports.withdrawWallet = withdrawWallet;
// Get wallet + recent transactions
const getWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const walletWithHistory = yield Wallet_1.Wallet.getWalletWithHistory(new mongoose_1.default.Types.ObjectId(userId), 10);
        if (!walletWithHistory.length)
            return res.status(404).json({ message: "Wallet not found" });
        res.status(200).json(walletWithHistory[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err });
    }
});
exports.getWallet = getWallet;
// Get current balance only
const getWalletBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const wallet = yield Wallet_1.Wallet.findOne({ userId });
        if (!wallet)
            return res.status(404).json({ message: "Wallet not found" });
        res.status(200).json({
            balance: wallet.balance,
            formattedBalance: wallet.formattedBalance
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err });
    }
});
exports.getWalletBalance = getWalletBalance;
// Get all wallet histories for all users
const getAllWalletHistories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const histories = yield Wallet_1.WalletHistory.find({})
            .populate("userId", "name email") // populate user details
            .populate("walletId", "balance currency") // populate wallet details
            .sort({ transactionDate: -1 });
        res.status(200).json(histories);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err });
    }
});
exports.getAllWalletHistories = getAllWalletHistories;
