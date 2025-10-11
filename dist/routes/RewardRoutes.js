"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const RewardController_1 = require("../controllers/RewardController");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ------------------ SUPERADMIN ROUTES ------------------
// Get all rewards
router.get("/all", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), RewardController_1.getAllRewards);
// Create, update, delete rewards
router.post("/create", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), RewardController_1.createReward);
router.put("/update/:rewardId", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), RewardController_1.updateReward);
router.delete("/delete/:rewardId", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), RewardController_1.deleteReward);
// Admin assigns reward to user
router.post("/assign/:rewardId/:userId", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), RewardController_1.assignRewardToUser);
router.get("/get/redeem/:userId", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), RewardController_1.getRedeemedRewardsByUser);
// ------------------ USER ROUTES ------------------
// Get active rewards for logged-in user
router.get("/my", protect_1.protect, (0, auth_1.authorize)(["user"]), RewardController_1.getActiveRewards);
// Redeem reward
router.post("/redeem/:rewardId", protect_1.protect, (0, auth_1.authorize)(["user"]), RewardController_1.redeemReward);
exports.default = router;
