import express from "express";
import {
  createReward,
  updateReward,
  getActiveRewards,
  assignRewardToUser,
  redeemReward,
  deleteReward,
  getRedeemedRewardsByUser,
  getAllRewards,
} from "../controllers/RewardController";
import { protect } from "../middleware/protect";
import { authorize } from "../middleware/auth";

const router = express.Router();

// ------------------ SUPERADMIN ROUTES ------------------
// Get all rewards
router.get("/all", protect, authorize(["superadmin"]), getAllRewards);

// Create, update, delete rewards
router.post("/create", protect, authorize(["superadmin"]), createReward);
router.put("/update/:rewardId", protect, authorize(["superadmin"]), updateReward);
router.delete("/delete/:rewardId", protect, authorize(["superadmin"]), deleteReward);

// Admin assigns reward to user
router.post("/assign/:rewardId/:userId", protect, authorize(["superadmin"]), assignRewardToUser);
router.get("/get/redeem/:userId", protect, authorize(["superadmin"]), getRedeemedRewardsByUser);

// ------------------ USER ROUTES ------------------
// Get active rewards for logged-in user
router.get("/my", protect, authorize(["user"]), getActiveRewards as any);

// Redeem reward
router.post("/redeem/:rewardId", protect, authorize(["user"]), redeemReward as any);

export default router;
