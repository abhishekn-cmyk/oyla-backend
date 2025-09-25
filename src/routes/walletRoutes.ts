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
import { authorize } from "../middleware/auth";

const router = express.Router();

// ============================
// Wallet Routes
// ============================

// Top-up wallet (user)
router.post("/topup", protect, authorize(["User"]), topupWallet);

// Spend wallet (user)
router.post("/spend", protect, authorize(["User"]), spendWallet);

// Withdraw wallet (user)
router.post("/withdraw", protect, authorize(["User"]), withdrawWallet);

// Get wallet with recent transactions (user)
router.get("/:userId", protect, authorize(["User"]), getWallet);

// Get wallet balance only (user)
router.get("/balance/:userId", protect, authorize(["User"]), getWalletBalance);

// Get all wallet histories (SuperAdmin only)
router.get("/histories/all", protect, authorize(["SuperAdmin"]), getAllWalletHistories);

export default router;
