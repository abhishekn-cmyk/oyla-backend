import express from "express";
import { 
  getWallet,
  getAllWalletHistories,
  getWalletBalance,
  spendWallet,
  topupWallet,
  withdrawWallet 
} from "../controllers/WalletController";

import { protect } from "../middleware/protect";
import { requireSuperAdmin, requireUser } from "../middleware/auth";

const router = express.Router();

// ============================
// Wallet Routes
// ============================

// Top-up wallet (user)
router.post("/topup", protect, requireUser, topupWallet);

// Spend wallet (user)
router.post("/spend", protect, requireUser, spendWallet);

// Withdraw wallet (user)
router.post("/withdraw", protect, requireUser, withdrawWallet);

// Get wallet with recent transactions (user)
router.get("/:userId", protect, requireUser, getWallet);

// Get wallet balance only (user)
router.get("/balance/:userId", protect, requireUser, getWalletBalance);

// Get all wallet histories (admin only)
router.get("/histories/all", protect, requireSuperAdmin, getAllWalletHistories);

export default router;
