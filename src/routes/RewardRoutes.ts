import express from "express";
import {
  createReward,
  updateReward,
  getActiveRewards,
  assignRewardToUser,
  redeemReward,
  deleteReward,
  getRedeemedRewardsByUser
} from "../controllers/RewardController";
import { protect } from "../middleware/protect";
import { requireSuperAdmin, requireUser } from "../middleware/auth";

const router = express.Router();

// ----- Admin Routes -----
router.post("/create", protect, requireSuperAdmin, createReward);
router.put("/update/:rewardId", protect, requireSuperAdmin, updateReward);
router.delete("/delete/:rewardId", protect, requireSuperAdmin, deleteReward);

// Admin assigns reward to user
router.post("/assign/:rewardId/:userId", protect, requireSuperAdmin, assignRewardToUser);
router.get('/get/reddem/:userId',protect,requireSuperAdmin,getRedeemedRewardsByUser);

// ----- User Routes -----
router.get("/my", protect, requireUser, getActiveRewards); // User sees their active rewards
router.post("/redeem/:rewardId", protect, requireUser, redeemReward); // User redeems their reward
export default router;

