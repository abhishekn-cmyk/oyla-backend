import { Request, Response } from "express";
import mongoose from "mongoose";
import Reward from "../models/Reward";
import User from "../models/User";

// Create a new reward
export const createReward = async (req: Request, res: Response) => {
  try {
    const reward = new Reward(req.body);
    await reward.save();
    res.status(201).json(reward);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// Update a reward by ID
export const updateReward = async (req: Request, res: Response) => {
  try {
    const { rewardId } = req.params;
    const reward = await Reward.findByIdAndUpdate(rewardId, req.body, { new: true });

    if (!reward) return res.status(404).json({ message: "Reward not found" });

    res.status(200).json(reward);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// Get all active rewards (not expired)
export const getActiveRewards = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id; // Logged-in user's ID
    const now = new Date();

    // Find active rewards assigned to this user and not expired
    const rewards = await Reward.find({
      isActive: true,
      users: userId, 
      redeemedUsers:userId,// user must be in 'users' array
      $or: [
        { expiryDate: null },         // no expiry
        { expiryDate: { $gte: now } } // not expired
      ]
    });

    res.status(200).json(rewards);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};


// Assign a reward to a user
export const assignRewardToUser = async (req: Request, res: Response) => {
  try {
    const { rewardId, userId } = req.params;

    const reward = await Reward.findById(rewardId);
    if (!reward) return res.status(404).json({ message: "Reward not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!reward.users) reward.users = [];

    const userObjectId = new mongoose.Types.ObjectId(user._id);

    if (!reward.users.some(u => u.toString() === user._id.toString())) {
      reward.users.push(userObjectId);
    }

    await reward.save();
    res.status(200).json({ message: "Reward assigned to user", reward });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// Redeem a reward for a user
export const redeemReward = async (req: Request, res: Response) => {
  try {
    const { rewardId } = req.params;
    const userId = req.user._id;

    const reward = await Reward.findById(rewardId);
    if (!reward) return res.status(404).json({ message: "Reward not found" });

    // Check if user is assigned
    if (!reward.users?.some(u => u.toString() === userId.toString())) {
      return res.status(400).json({ message: "You do not have this reward assigned" });
    }

    // Remove user from `users` and add to `redeemedUsers`
    reward.users = reward.users.filter(u => u.toString() !== userId.toString());

    if (!reward.redeemedUsers) reward.redeemedUsers = [];
    if (!reward.redeemedUsers.some(u => u.toString() === userId.toString())) {
      reward.redeemedUsers.push(userId);
    }

    await reward.save();

    res.status(200).json({ message: "Reward redeemed successfully", reward });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};


export const getRedeemedRewardsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Optional: check if user exists
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Find rewards where the user is in redeemedUsers
    const rewards = await Reward.find({
      redeemedUsers: userId
    });

    res.status(200).json(rewards);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};



// Optional: Delete a reward
export const deleteReward = async (req: Request, res: Response) => {
  try {
    const { rewardId } = req.params;

    const reward = await Reward.findByIdAndDelete(rewardId);
    if (!reward) return res.status(404).json({ message: "Reward not found" });

    res.status(200).json({ message: "Reward deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};
