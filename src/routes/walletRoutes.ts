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
router.post("/topup", protect, authorize(["user"]), topupWallet);

// Spend wallet (user)
router.post("/spend", protect, authorize(["user"]), spendWallet);

// Withdraw wallet (user)
router.post("/withdraw", protect, authorize(["user"]), withdrawWallet);

// Get wallet with recent transactions (user)
router.get("/:userId", protect, authorize(["user"]), getWallet);

// Get wallet balance only (user)
router.get("/balance/:userId", protect, authorize(["user"]), getWalletBalance);

// Get all wallet histories (superadmin only)
router.get("/histories/all", protect, authorize(["superadmin"]), getAllWalletHistories);

export default router;
