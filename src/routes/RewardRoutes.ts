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
router.get("/all", protect, authorize(["SuperAdmin"]), getAllRewards);
// ----- SUPERADMIN ROUTES -----
router.post("/create", protect, authorize(["SuperAdmin"]), createReward);
router.put("/update/:rewardId", protect, authorize(["SuperAdmin"]), updateReward);
router.delete("/delete/:rewardId", protect, authorize(["SuperAdmin"]), deleteReward);

// Admin assigns reward to user
router.post("/assign/:rewardId/:userId", protect, authorize(["SuperAdmin"]), assignRewardToUser);
router.get("/get/redeem/:userId", protect, authorize(["SuperAdmin"]), getRedeemedRewardsByUser);

// ----- USER ROUTES -----
// Use type assertion for routes that need AuthenticatedRequest
router.get("/my", protect, authorize(["User"]), getActiveRewards as any);
router.post("/redeem/:rewardId", protect, authorize(["User"]), redeemReward as any);

export default router;