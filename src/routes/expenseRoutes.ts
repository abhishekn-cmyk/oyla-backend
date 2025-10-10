import { Router } from "express";
import { upload } from "../middleware/uploadMiddleware";

import {
  addExpense,
  allocateExpenseToProduct,
  getProfitLossReport,
  getSubscriptionRevenueReport,
  updateMealStatus,
  deliverTodayMeals,
  autoRenewSubscriptions,
  getUserMealPlan,
  assignDeliveryPartner,
  getDeliveryStats,
  markRefundEligible,getExpenses,
  addCategoryMaster,
  getCategoryMasters,
  getCategoryMasterById,
  updateCategoryMaster,
  deleteCategoryMaster
} from "../controllers/ExpensesController";

const router = Router();
router.get("/expense", getExpenses);
// ---------------- Expense Routes ----------------
router.post("/expense", upload.array("images", 10), addExpense); // Add new expense with multiple attachments
router.post("/allocate-expense", allocateExpenseToProduct);     // Allocate expense to product

// ---------------- Reports ----------------
router.get("/profit-loss", getProfitLossReport);               // Product-wise Profit & Loss report
router.get("/revenue", getSubscriptionRevenueReport);          // Total subscription revenue report

// ---------------- Meal Management ----------------
router.post("/meal-status", updateMealStatus);                 // Update meal status (delivered/pending)
router.post("/deliver/:subscriptionId", deliverTodayMeals);    // Deliver today's meals

// ---------------- User Meal Plan ----------------
router.get("/user/:userId/meals", getUserMealPlan);            // Get day-by-day meal plan per user

// ---------------- Auto-Renew Subscriptions ----------------
// Can also run this as a CRON job
router.post("/auto-renew", async (req, res) => {
  try {
    await autoRenewSubscriptions();
    res.status(200).json({ success: true, message: "Auto-renew process completed." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- Delivery Partner ----------------
router.post("/assign-partner", assignDeliveryPartner);         // Assign delivery partner to subscription
router.get("/delivery-stats", getDeliveryStats);              // Get delivery stats per partner

// ---------------- Refund Management ----------------
router.post("/refund-eligible", markRefundEligible);          // Mark subscription refund eligible
router.post("/category", addCategoryMaster);
router.get("/category", getCategoryMasters);
router.get("/:id/category", getCategoryMasterById);
router.put("/:id/category", updateCategoryMaster);
router.delete("/:id/category", deleteCategoryMaster);
export default router;
