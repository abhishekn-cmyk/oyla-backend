import express from "express";
import {
  createSubscription,
  toggleSubscriptionStatus,
  processRefund,
  lockMealsAfterChangeWindow,
  autoRenewSubscriptions,
  upsertSetting,
  getSettings,
  deleteSetting,
} from "../controllers/systemController";
import {  authorize } from "../middleware/auth";
import { protect } from "../middleware/protect";
const router = express.Router();

// ----------------- SUBSCRIPTION ROUTES -----------------
router.get('/', (req, res) => res.send('System route works'));
// Create a subscription (logged-in users)
router.post("/create", createSubscription);

// Pause / Resume subscription (logged-in users)
router.patch("/:subscriptionId/toggle-status",  toggleSubscriptionStatus);

// Refund subscription (admin only)
router.post("/refund", protect, authorize(["superadmin"]), processRefund);

// ----------------- SYSTEM SETTINGS (SUPERADMIN ONLY) -----------------
router.post("/settings", protect,authorize(["superadmin"]), upsertSetting);
router.get("/settings", protect,authorize(["superadmin"]), getSettings);
router.delete("/settings/:key", protect, authorize(["superadmin"]), deleteSetting);

// ----------------- CRON / UTILITY ENDPOINTS -----------------

// Lock meals after change window (internal / cron)
router.post("/lock-meals", protect, authorize(["superadmin"]), async (req, res) => {
  try {
    await lockMealsAfterChangeWindow();
    res.json({ message: "Meals locked successfully" });
  } catch (err: any) {
    res.status(500).json({ message: "Error locking meals", error: err.message });
  }
});

// Auto-renew subscriptions (internal / cron)
router.post("/auto-renew", protect, authorize(["superadmin"]), async (req, res) => {
  try {
    await autoRenewSubscriptions();
    res.json({ message: "Auto-renew executed successfully" });
  } catch (err: any) {
    res.status(500).json({ message: "Error in auto-renew", error: err.message });
  }
});

export default router;
