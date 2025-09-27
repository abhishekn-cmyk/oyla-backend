"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const WalletController_1 = require("../controllers/WalletController");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ============================
// Wallet Routes
// ============================
// Top-up wallet (user)
router.post("/topup", protect_1.protect, (0, auth_1.authorize)(["User"]), WalletController_1.topupWallet);
// Spend wallet (user)
router.post("/spend", protect_1.protect, (0, auth_1.authorize)(["User"]), WalletController_1.spendWallet);
// Withdraw wallet (user)
router.post("/withdraw", protect_1.protect, (0, auth_1.authorize)(["User"]), WalletController_1.withdrawWallet);
// Get wallet with recent transactions (user)
router.get("/:userId", protect_1.protect, (0, auth_1.authorize)(["User"]), WalletController_1.getWallet);
// Get wallet balance only (user)
router.get("/balance/:userId", protect_1.protect, (0, auth_1.authorize)(["User"]), WalletController_1.getWalletBalance);
// Get all wallet histories (SuperAdmin only)
router.get("/histories/all", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), WalletController_1.getAllWalletHistories);
exports.default = router;
