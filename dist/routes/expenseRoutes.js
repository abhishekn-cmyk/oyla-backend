"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
const ExpensesController_1 = require("../controllers/ExpensesController");
const router = (0, express_1.Router)();
router.get("/expense", ExpensesController_1.getExpenses);
// ---------------- Expense Routes ----------------
router.post("/expense", uploadMiddleware_1.upload.array("images", 10), ExpensesController_1.addExpense); // Add new expense with multiple attachments
router.post("/allocate-expense", ExpensesController_1.allocateExpenseToProduct); // Allocate expense to product
// ---------------- Reports ----------------
router.get("/profit-loss", ExpensesController_1.getProfitLossReport); // Product-wise Profit & Loss report
router.get("/revenue", ExpensesController_1.getSubscriptionRevenueReport); // Total subscription revenue report
// ---------------- Meal Management ----------------
router.post("/meal-status", ExpensesController_1.updateMealStatus); // Update meal status (delivered/pending)
router.post("/deliver/:subscriptionId", ExpensesController_1.deliverTodayMeals); // Deliver today's meals
// ---------------- User Meal Plan ----------------
router.get("/user/:userId/meals", ExpensesController_1.getUserMealPlan); // Get day-by-day meal plan per user
// ---------------- Auto-Renew Subscriptions ----------------
// Can also run this as a CRON job
router.post("/auto-renew", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, ExpensesController_1.autoRenewSubscriptions)();
        res.status(200).json({ success: true, message: "Auto-renew process completed." });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}));
// ---------------- Delivery Partner ----------------
router.post("/assign-partner", ExpensesController_1.assignDeliveryPartner); // Assign delivery partner to subscription
router.get("/delivery-stats", ExpensesController_1.getDeliveryStats); // Get delivery stats per partner
// ---------------- Refund Management ----------------
router.post("/refund-eligible", ExpensesController_1.markRefundEligible); // Mark subscription refund eligible
router.post("/category", ExpensesController_1.addCategoryMaster);
router.get("/category", ExpensesController_1.getCategoryMasters);
router.get("/:id/category", ExpensesController_1.getCategoryMasterById);
router.put("/:id/category", ExpensesController_1.updateCategoryMaster);
router.delete("/:id/category", ExpensesController_1.deleteCategoryMaster);
exports.default = router;
