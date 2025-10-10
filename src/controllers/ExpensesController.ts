import { Request, Response } from "express";
import { Expense } from "../models/Expenses";
import { ProductModel } from "../models/Product";
import Subscription from "../models/Subscription";
import { CategoryMaster } from "../models/Category";

// Add Expense


export const addExpense = async (req: Request, res: Response) => {
  try {
    const attachments = (req.files as Express.Multer.File[] | undefined)?.map(f => f.path) || [];
    const { item, quantity, amount, category, referenceNumber } = req.body;

    if (!item || !amount || !category)
      return res.status(400).json({ success: false, message: "Item, amount, category required" });

    // ✅ Validate category exists in CategoryMaster
    const catExists = await CategoryMaster.findOne({ name: category });
    if (!catExists) return res.status(400).json({ success: false, message: "Category does not exist" });

    const expense = await Expense.create({ item, quantity, amount, category, referenceNumber, attachments });
    res.status(201).json({ success: true, expense });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Allocate Expense to Product
export const allocateExpenseToProduct = async (req: Request, res: Response) => {
  try {
    const { productId, expenseAmount } = req.body;
    
    // ✅ Validate input
    if (!productId || expenseAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: "productId and expenseAmount are required",
      });
    }


    // ✅ Find product
    const product = await ProductModel.findById(productId);
    
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    // ✅ Ensure numeric addition
    const expenseValue = Number(expenseAmount);
    if (isNaN(expenseValue))
      return res.status(400).json({ success: false, message: "Invalid expenseAmount" });

    // ✅ Safely increment
    product.totalExpense = (product.totalExpense || 0) + expenseValue;
    await product.save();

    res.status(200).json({
      success: true,
      message: "Expense successfully allocated to product",
      product,
    });
  } catch (err: any) {
    console.error("Error allocating expense:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// Profit & Loss Report
export const getProfitLossReport = async (req: Request, res: Response) => {
  try {
    const products = await ProductModel.find({});
    const subscriptions = await Subscription.find({}).populate(
      "meals.breakfast meals.lunch meals.dinner"
    );

    const productReports = products.map(product => {
      const totalCost = product.totalExpense || 0;
      let totalRevenue = 0;

      subscriptions.forEach(sub => {
        if (!sub.totalMeals || sub.totalMeals === 0) return;
        const revenuePerMeal = sub.price / sub.totalMeals;

        sub.meals.forEach(meal => {
          // Collect all possible meal items (breakfast, lunch, dinner)
          const allMeals = [meal.breakfast, meal.lunch, meal.dinner].filter(Boolean);

          allMeals.forEach(mealItem => {
            if (mealItem?._id?.toString() === product.id.toString()) {
              totalRevenue += revenuePerMeal;
            }
          });
        });
      });

      const profitOrLoss = totalRevenue - totalCost;

      return {
        productId: product._id,
        name: product.name,
        totalCost,
        totalRevenue,
        profit: profitOrLoss > 0 ? profitOrLoss : 0,
        loss: profitOrLoss < 0 ? Math.abs(profitOrLoss) : 0,
      };
    });

    // Also compute grand totals if you want an overall summary
    const totals = productReports.reduce(
      (acc, p) => {
        acc.totalCost += p.totalCost;
        acc.totalRevenue += p.totalRevenue;
        acc.totalProfit += p.profit;
        acc.totalLoss += p.loss;
        return acc;
      },
      { totalCost: 0, totalRevenue: 0, totalProfit: 0, totalLoss: 0 }
    );

    res.status(200).json({ products: productReports, totals });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};





// Auto-Renew Subscriptions
export const autoRenewSubscriptions = async () => {
  try {
    const today = new Date();
    const expiringSubs = await Subscription.find({
      endDate: { $lte: today },
      autoRenew: true,
      status: "active"
    });

    for (const sub of expiringSubs) {
      const newStart = new Date();
      const newEnd = new Date();
      newEnd.setDate(newStart.getDate() + sub.durationDays);

      const data = sub.toObject();
      delete data._id;

      const renewedSub = new Subscription({
        ...data,
        startDate: newStart,
        endDate: newEnd,
        status: "active",
        deliveredMeals: 0,
        pendingDeliveries: sub.totalMeals,
        consumedMeals: 0,
        remainingMeals: sub.totalMeals,
        price: sub.price - (sub.discountAmount || 0)
      });

      await renewedSub.save();
    }
  } catch (err) {
    console.error("Auto-renew error:", err);
  }
};

// Assign Delivery Partner
export const assignDeliveryPartner = async (req: Request, res: Response) => {
  try {
    const { subscriptionId, partnerId } = req.body;
    const sub = await Subscription.findById(subscriptionId);
    if (!sub) return res.status(404).json({ message: "Subscription not found" });

    sub.deliveryAddress = { ...sub.deliveryAddress, partnerId } as any;
    await sub.save();

    res.status(200).json({ success: true, subscription: sub });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delivery Stats
export const getDeliveryStats = async (req: Request, res: Response) => {
  try {
    const stats = await Subscription.aggregate([
      { $match: { status: "active" } },
      { $group: {
          _id: "$deliveryAddress.partnerId",
          totalSubscriptions: { $sum: 1 },
          totalDelivered: { $sum: "$deliveredMeals" },
          totalPending: { $sum: "$pendingDeliveries" }
        }
      }
    ]);
    res.status(200).json({ stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Mark Refund Eligible
export const markRefundEligible = async (req: Request, res: Response) => {
  try {
    const { subscriptionId, eligible } = req.body;
    const sub = await Subscription.findById(subscriptionId);
    if (!sub) return res.status(404).json({ message: "Subscription not found" });

    sub.cancellationStatus = eligible ? "pending" : sub.cancellationStatus;
    await sub.save();

    res.status(200).json({ success: true, subscription: sub });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Subscription Revenue Report
export const getSubscriptionRevenueReport = async (req: Request, res: Response) => {
  try {
    const subscriptions = await Subscription.find({});
    const totalRevenue = subscriptions.reduce((acc, sub) => acc + (sub.price || 0), 0);
    const totalSubscriptions = subscriptions.length;

    res.status(200).json({ totalRevenue, totalSubscriptions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// GET /expense
export const getExpenses = async (req: Request, res: Response) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: -1 });
    res.status(200).json(expenses);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------------- Update Meal Status ----------------
export const updateMealStatus = async (req: Request, res: Response) => {
  try {
    const { subscriptionId, date, status } = req.body;
    const sub = await Subscription.findById(subscriptionId);
    if (!sub) return res.status(404).json({ message: "Subscription not found" });

    const targetDate = new Date(date);
    const meal = sub.meals.find(
      m => new Date(m.date).toDateString() === targetDate.toDateString()
    );

    if (!meal) return res.status(404).json({ message: "Meal not found" });

    if (status === "delivered" && meal.status !== "delivered") {
      sub.deliveredMeals++;
      sub.pendingDeliveries = Math.max(sub.pendingDeliveries - 1, 0);
    }

    meal.status = status;
    await sub.save();

    res.status(200).json({ success: true, subscription: sub });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------------- Deliver Today's Meals ----------------
export const deliverTodayMeals = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const sub = await Subscription.findById(subscriptionId);
    if (!sub) return res.status(404).json({ message: "Subscription not found" });

    const todayStr = new Date().toISOString().split("T")[0];
    const meal = sub.meals.find(
      m => new Date(m.date).toISOString().split("T")[0] === todayStr
    );

    if (!meal) return res.status(404).json({ message: "No meal scheduled for today" });

    if (meal.status !== "delivered") {
      meal.status = "delivered";
      sub.deliveredMeals += 1;
      sub.pendingDeliveries = Math.max(sub.pendingDeliveries - 1, 0);
      sub.lastDeliveredAt = new Date();
      await sub.save();
    }

    res.status(200).json({ success: true, subscription: sub });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------------- Get User Meal Plan ----------------
export const getUserMealPlan = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const sub = await Subscription.findOne({ userId, status: "active" }).populate(
      "meals.breakfast meals.lunch meals.dinner"
    );

    if (!sub) return res.status(404).json({ message: "Active subscription not found for this user" });

    const today = new Date();
    const mealsPlan = sub.meals
      .filter(m => new Date(m.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(m => ({
        date: m.date.toISOString().split("T")[0],
        breakfast: m.breakfast ? { id: (m.breakfast as any)._id, name: (m.breakfast as any).name } : null,
        lunch: m.lunch ? { id: (m.lunch as any)._id, name: (m.lunch as any).name } : null,
        dinner: m.dinner ? { id: (m.dinner as any)._id, name: (m.dinner as any).name } : null,
        status: m.status,
      }));

    res.status(200).json({ subscriptionId: sub._id, mealsPlan });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};





// Add a new category
export const addCategoryMaster = async (req: Request, res: Response) => {
  try {
    const { name, type, description } = req.body;
    const category = new CategoryMaster({ name, type, description });
    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all categories, optional filter by type
export const getCategoryMasters = async (req: Request, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.type) filter.type = req.query.type;
    const categories = await CategoryMaster.find(filter);
    res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get category by ID
export const getCategoryMasterById = async (req: Request, res: Response) => {
  try {
    const category = await CategoryMaster.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update category
export const updateCategoryMaster = async (req: Request, res: Response) => {
  try {
    const { name, type, description, isActive } = req.body;

    const category = await CategoryMaster.findByIdAndUpdate(
      req.params.id,
      { name, type, description, isActive },
      { new: true, runValidators: true }
    );

    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    // ✅ Update existing expenses that had the old category name
    await Expense.updateMany(
      { category: category.name }, // old category name
      { category: name } // new category name
    );

    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete category
export const deleteCategoryMaster = async (req: Request, res: Response) => {
  try {
    const category = await CategoryMaster.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

