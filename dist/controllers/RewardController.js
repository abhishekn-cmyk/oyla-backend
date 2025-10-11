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
exports.deleteReward = exports.getRedeemedRewardsByUser = exports.redeemReward = exports.assignRewardToUser = exports.getActiveRewards = exports.getAllRewards = exports.updateReward = exports.createReward = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Reward_1 = __importDefault(require("../models/Reward"));
const User_1 = __importDefault(require("../models/User"));
const server_1 = require("../server");
const createNotification_1 = require("./createNotification");
// Create a new reward
const createReward = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reward = new Reward_1.default(req.body);
        yield reward.save();
        res.status(201).json(reward);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.createReward = createReward;
// Update a reward by ID
const updateReward = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { rewardId } = req.params;
        const reward = yield Reward_1.default.findByIdAndUpdate(rewardId, req.body, { new: true });
        if (!reward)
            return res.status(404).json({ message: "Reward not found" });
        res.status(200).json(reward);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.updateReward = updateReward;
const getAllRewards = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rewards = yield Reward_1.default.find().sort({ createdAt: -1 });
        res.json(rewards);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.getAllRewards = getAllRewards;
// Get all active rewards (not expired)
const getActiveRewards = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id; // Logged-in user's ID
        const now = new Date();
        // Find active rewards assigned to this user and not expired
        const rewards = yield Reward_1.default.find({
            isActive: true,
            users: userId,
            $or: [
                { expiryDate: null }, // no expiry
                { expiryDate: { $gte: now } } // not expired
            ]
        });
        res.status(200).json(rewards);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.getActiveRewards = getActiveRewards;
// Assign a reward to a user
const assignRewardToUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { rewardId, userId } = req.params;
        const reward = yield Reward_1.default.findById(rewardId);
        if (!reward)
            return res.status(404).json({ message: "Reward not found" });
        const user = yield User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (!reward.users)
            reward.users = [];
        const userObjectId = new mongoose_1.default.Types.ObjectId(user.id);
        if (!reward.users.some(u => u.toString() === user.id.toString())) {
            reward.users.push(userObjectId);
            yield reward.save();
            // ------------------ Send Notification ------------------
            const notification = yield (0, createNotification_1.createUserNotification)(userId, "New Reward Assigned", `You have been assigned the reward: ${reward.title}`);
            // Emit real-time notification via Socket.IO
            server_1.io.to(userId).emit("newNotification", notification);
        }
        res.status(200).json({ message: "Reward assigned to user", reward });
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.assignRewardToUser = assignRewardToUser;
// Redeem a reward for a user
const redeemReward = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { rewardId } = req.params;
        const userId = req.user._id;
        const reward = yield Reward_1.default.findById(rewardId);
        if (!reward)
            return res.status(404).json({ message: "Reward not found" });
        if (!((_a = reward.users) === null || _a === void 0 ? void 0 : _a.some(u => u.toString() === userId.toString()))) {
            return res.status(400).json({ message: "You do not have this reward assigned" });
        }
        // Redeem logic
        reward.users = reward.users.filter(u => u.toString() !== userId.toString());
        reward.redeemedUsers = reward.redeemedUsers || [];
        if (!reward.redeemedUsers.some(u => u.toString() === userId.toString())) {
            reward.redeemedUsers.push(new mongoose_1.default.Types.ObjectId(userId));
        }
        yield reward.save();
        // Emit real-time event
        server_1.io.emit("rewardRedeemed", { rewardId, userId });
        res.status(200).json({ message: "Reward redeemed successfully", reward });
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.redeemReward = redeemReward;
const getRedeemedRewardsByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        // Optional: check if user exists
        const user = yield User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        // Find rewards where the user is in redeemedUsers
        const rewards = yield Reward_1.default.find({
            redeemedUsers: userId
        });
        res.status(200).json(rewards);
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.getRedeemedRewardsByUser = getRedeemedRewardsByUser;
// Optional: Delete a reward
const deleteReward = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { rewardId } = req.params;
        const reward = yield Reward_1.default.findByIdAndDelete(rewardId);
        if (!reward)
            return res.status(404).json({ message: "Reward not found" });
        res.status(200).json({ message: "Reward deleted successfully" });
    }
    catch (err) {
        res.status(500).json({ error: err.message || err });
    }
});
exports.deleteReward = deleteReward;
