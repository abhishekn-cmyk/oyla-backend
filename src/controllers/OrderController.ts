import { Request, Response } from "express";
import { DailyOrder } from "../models/DailyOrder";
import Cart from "../models/Cart";
import User from "../models/User";
import Payment from "../models/Payment";
import { Wallet, WalletHistory } from "../models/Wallet";
import { createUserNotification } from "./createNotification";
import { io } from "../server";
import Stripe from "stripe";
import Delivery from "../models/Delivery";
import DeliveryPartner from "../models/DeliveryPartner";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export const checkout = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { paymentMethod, shippingAddress } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const cart = await Cart.findOne({ userId }).populate("items.product");
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Cart is empty" });

    // Build meals array for DailyOrder
    const meals = cart.items.map((item) => {
      const product: any = item.product;
      return {
        productId: product._id,
        slot: "lunch", // or calculate dynamically if needed
        quantity: item.quantity,
        price: Number(product.price) || 0,
        costPrice: Number(product.costPrice) || 0,
        status: "scheduled",
        locked: false,
      };
    });

    const totalPrice = meals.reduce((sum, meal) => sum + (meal.price * meal.quantity), 0);
    const totalCost = meals.reduce((sum, meal) => sum + (meal.costPrice * meal.quantity), 0);

    // ---------------- Wallet Payment ----------------
    if (paymentMethod === "wallet") {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || wallet.balance < totalPrice)
        return res.status(400).json({ message: "Insufficient wallet balance" });

      const balanceBefore = wallet.balance;
      wallet.balance -= totalPrice;
      wallet.totalSpent += totalPrice;
      await wallet.save();

      await WalletHistory.create({
        userId,
        walletId: wallet._id,
        type: "payment",
        amount: totalPrice,
        currency: wallet.currency,
        balanceBefore,
        balanceAfter: wallet.balance,
        description: "Payment for DailyOrder",
        status: "completed",
      });

      const dailyOrder = await DailyOrder.create({
        userId,
        meals,
        totalPrice,
        totalCost,
        orderStatus: "pending",
        
        paymentStatus: "paid",
        paymentMethod,
      });

      await Payment.create({
        userId,
        orderId: dailyOrder._id,
        amount: totalPrice,
        currency: "KWD",
        gateway: "wallet",
        status: "completed",
      });

      cart.items = [];
      cart.totalPrice = 0;
      await cart.save();

      await createUserNotification(
        userId,
        "Order Placed",
        `Your order of KWD ${totalPrice.toFixed(3)} has been placed successfully.`
      );

      return res.status(201).json({ dailyOrder, paymentStatus: "completed" });
    }

    // ---------------- COD ----------------
    if (paymentMethod === "cod") {
      const dailyOrder = await DailyOrder.create({
        userId,
        meals,
        totalPrice,
        totalCost,
        orderStatus: "pending",
        paymentStatus: "pending",
        paymentMethod,
      });

      await Payment.create({
        userId,
        orderId: dailyOrder._id,
        amount: totalPrice,
        currency: "KWD",
        gateway: "cod",
        status: "pending",
      });

      cart.items = [];
      cart.totalPrice = 0;
      await cart.save();

      await createUserNotification(
        userId,
        "Order Placed",
        `Your COD order of KWD ${totalPrice.toFixed(3)} has been placed. Pay upon delivery.`
      );

      return res.status(201).json({ dailyOrder, paymentStatus: "pending" });
    }

    // ---------------- Stripe / Online Payment ----------------
    const line_items = meals.map((meal) => ({
      price_data: {
        currency: "kwd",
        product_data: { name: "Meal" },
        unit_amount: Math.round(meal.price * 1000),
      },
      quantity: meal.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      metadata: { userId, cartId: cart.id.toString() },
      payment_intent_data: { description: `DailyOrder by user ${userId}` },
    });

    const dailyOrder = await DailyOrder.create({
      userId,
      meals,
      totalPrice,
      totalCost,
      orderStatus: "pending",
      paymentStatus: "pending",
      paymentMethod,
    });

    await Payment.create({
      userId,
      orderId: dailyOrder._id,
      amount: totalPrice,
      currency: "KWD",
      gateway: "stripe",
      status: "pending",
      transactionId: session.payment_intent as string,
    });

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    await createUserNotification(
      userId,
      "Order Created",
      `Your order of KWD ${totalPrice.toFixed(3)} has been created. Complete payment to confirm.`
    );

    return res.status(201).json({ dailyOrderId: dailyOrder._id, checkoutUrl: session.url });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || err });
  }
};

// ------------------- Get All DailyOrders -------------------
export const getAllDailyOrders = async (req: Request, res: Response) => {
  try {
    const orders = await DailyOrder.find()
      .populate("userId", "-password")
      .populate({
        path: "subscriptionId",
        select: "planName planType price",
      })
      .populate("deliveryPartner")
      .populate({
        path: "meals.productId",
        select: "name price costPrice",
      })
      .lean();

    const orderIds = orders.map((o) => o._id);
    const payments = await Payment.find({ orderId: { $in: orderIds } }).lean();

    const paymentsByOrder: Record<string, any[]> = {};
    payments.forEach((p) => {
      const key = p.orderId.toString();
      if (!paymentsByOrder[key]) paymentsByOrder[key] = [];
      paymentsByOrder[key].push(p);
    });

    const enrichedOrders = orders.map((order: any) => ({
      ...order,
      payments: paymentsByOrder[order._id.toString()] || [],
      meals: order.meals.map((meal: any) => ({
        ...meal,
        productName: meal.productId?.name || "Unknown",
        productPrice: meal.productId?.price || 0,
        productCostPrice: meal.productId?.costPrice || 0,
      })),
      subscriptionInfo: order.subscriptionId
        ? {
            planName: (order.subscriptionId as any).planName || null,
            planType: (order.subscriptionId as any).planType || null,
            price: (order.subscriptionId as any).price || 0,
          }
        : null,
    }));

    res.status(200).json(enrichedOrders);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};



// ------------------- Get DailyOrders by User -------------------
export const getDailyOrdersByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const orders = await DailyOrder.find({ userId })
      .populate("userId", "-password")
      .populate("subscriptionId")
      .populate("deliveryPartner")
      .populate("meals.productId")
      .lean();

    const orderIds = orders.map((o) => o._id);
    const payments = await Payment.find({ orderId: { $in: orderIds } }).lean();

    const paymentsByOrder: Record<string, any[]> = {};
    payments.forEach((p) => {
      const key = p.orderId.toString();
      if (!paymentsByOrder[key]) paymentsByOrder[key] = [];
      paymentsByOrder[key].push(p);
    });

    const enrichedOrders = orders.map((order) => ({
      ...order,
      payments: paymentsByOrder[order._id.toString()] || [],
    }));

    res.status(200).json(enrichedOrders);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// ------------------- Get DailyOrder by ID -------------------
export const getDailyOrderById = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await DailyOrder.findById(orderId)
      .populate("userId", "-password")
      .populate("subscriptionId")
      .populate("deliveryPartner")
      .populate("meals.productId");

    if (!order) return res.status(404).json({ message: "DailyOrder not found" });

    res.status(200).json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// ------------------- Toggle Meal Status (Enhanced) -------------------
export const toggleDailyOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await DailyOrder.findById(id);
    if (!order) return res.status(404).json({ message: "DailyOrder not found" });

    // ------------------ Toggle meal status ------------------
    order.meals = order.meals.map((meal) => {
      let newStatus: typeof meal.status;

      switch (meal.status) {
        case "scheduled":
          newStatus = "prepared";
          break;
        case "prepared":
          newStatus = "dispatched";
          break;
        case "dispatched":
          newStatus = "delivered";
          break;
        case "delivered":
        case "delayed":
          newStatus = meal.status; // no change
          break;
        default:
          newStatus = "scheduled";
      }

      // Maintain status history
      if (!meal.statusHistory) meal.statusHistory = [];
      meal.status = newStatus;
      meal.statusHistory.push({ status: newStatus, updatedAt: new Date() });

      return meal;
    });

    // ------------------ Calculate meal counts ------------------
    const totalMeals = order.meals.length;
    const deliveredMeals = order.meals.filter(m => m.status === "delivered").length;
    const delayedMeals = order.meals.filter(m => m.status === "delayed").length;
    const dispatchedMeals = order.meals.filter(m => m.status === "dispatched").length;
    const preparedMeals = order.meals.filter(m => m.status === "prepared").length;
    const scheduledMeals = order.meals.filter(m => m.status === "scheduled").length;

    // ------------------ Determine orderStatus ------------------
    if (deliveredMeals === totalMeals) {
      order.orderStatus = "delivered";
      order.paymentStatus = "paid";
    } else if (delayedMeals === totalMeals) {
    
      order.orderStatus = "delayed";
      order.paymentStatus = "refunded";
    } else if (deliveredMeals > 0 && delayedMeals > 0) {
      order.orderStatus = "partially_delivered";
      order.paymentStatus = "partial_refund";
    } else if (dispatchedMeals > 0) {
      order.orderStatus = "out_for_delivery";
      order.paymentStatus = "pending";
    } else if (preparedMeals > 0) {
      order.orderStatus = "preparing";
      order.paymentStatus = "pending";
    } else if (scheduledMeals > 0) {
      order.orderStatus = "confirmed";
      order.paymentStatus = "pending";
    } else {
      order.orderStatus = "pending";
      order.paymentStatus = "pending";
    }

    // ------------------ Save & return ------------------
    await order.save();

    res.status(200).json({
      message: "DailyOrder updated successfully",
      meals: order.meals,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
    });

  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || err });
  }
};


export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    let { status } = req.body;

    if (!status) return res.status(400).json({ message: "Status is required" });

    // Normalize status
    status = status.toLowerCase();
    // console.log("Incoming status:", status);

    // 1️⃣ Fetch order
    const order = await DailyOrder.findById(orderId).populate("meals.productId");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const now = new Date();

    // 2️⃣ Update meal statuses & history
    order.meals.forEach((meal) => {
      meal.status = status;
      if (!meal.statusHistory) meal.statusHistory = [];
      meal.statusHistory.push({ status, updatedAt: now });

      // Meal-level delay for delayed meals
      if (status === "delayed" && meal.expectedDeliveryTime) {
        const delayMs = now.getTime() - new Date(meal.expectedDeliveryTime).getTime();
        const totalSeconds = Math.floor(delayMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        meal.delayMinutes = `${hours} hr ${minutes} min ${seconds} sec`;
      }
    });

    // 3️⃣ Map meal status → order status
    const mapMealToOrderStatus = (mealStatus: string): typeof order.orderStatus => {
      switch (mealStatus.toLowerCase()) {
        case "scheduled":
          return "confirmed";
        case "preparing":
          return "preparing";
        case "prepared":
          return "prepared";
        case "dispatched":
        case "out_for_delivery":
          return "out_for_delivery";
        case "delivered":
          return "delivered";
        case "delayed":
          return "delayed";
        case "cancelled":
          return "cancelled";
        case "partially_delivered":
          return "partially_delivered";
        case "partially_refunded":
          return "partially_refunded";
        default:
          return "pending";
      }
    };

    order.orderStatus = mapMealToOrderStatus(status);
    // console.log("Mapped orderStatus:", order.orderStatus);

    // 4️⃣ Calculate order-level delay **only when delivered**
    if (status === "delivered") {
      let maxDelayMs = 0;

      order.meals.forEach((meal) => {
        if (meal.expectedDeliveryTime) {
          const mealDelay = now.getTime() - new Date(meal.expectedDeliveryTime).getTime();
          if (mealDelay > maxDelayMs) maxDelayMs = mealDelay;
        }
      });

      if (maxDelayMs > 0) {
              const totalSeconds = maxDelayMs / 1000; // keep fraction
              const hours = Math.floor(totalSeconds / 3600);
              const minutes = Math.floor((totalSeconds % 3600) / 60);
              const seconds = (totalSeconds % 60).toFixed(2); // keep 2 decimal places

              order.delayDuration = `${hours} hr ${minutes} min ${seconds} sec`;
            } else {
              order.delayDuration = "0.00 sec"; // delivered exactly on time
            }

    }

    await order.save();

    // 5️⃣ Update Delivery + Partner Stats
    const deliveries = await Delivery.find({ orderId });
    const partnerIds = [...new Set(deliveries.map((d) => d.driverId?.toString()))];

    await Promise.all(
      partnerIds.map(async (partnerId) => {
        if (!partnerId) return;

        // Update delivery status for this order
        await Delivery.updateMany({ orderId, driverId: partnerId }, { deliveryStatus: status });

        // Fetch partner
        const partner = await DeliveryPartner.findById(partnerId) as any;
        if (!partner) return;

        // Always update total deliveries
        partner.totalDeliveries = await Delivery.countDocuments({ driverId: partnerId });
        

        // Increment completed / delayed counts
        if (status === "delivered") {
          partner.completedDeliveries = (partner.completedDeliveries || 0) + 1;
        }
        if (status === "delayed") {
          partner.delayedDeliveries = (partner.delayedDeliveries || 0) + 1;
        }

        await partner.save();
      })
    );

    res.json({
      message: "✅ Order, meals, deliveries, and partner stats updated successfully",
      order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// Update payment status
export const updatePaymentStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus } = req.body;

    // Update order paymentStatus
    const order = await DailyOrder.findByIdAndUpdate(
      orderId,
      { paymentStatus },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Update corresponding Payment document(s)
    await Payment.updateMany(
      { orderId }, // assuming Payment has orderId field
      { status: paymentStatus } // assuming Payment model has a "status" field
    );

    res.json({ message: "Payment status updated", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------- DailyOrder Stats -------------------
export const getDailyOrderStats = async (req: Request, res: Response) => {
  try {
    const dailyOrders = await DailyOrder.find()
      .populate("subscriptionId")
      .populate("userId")
      .populate("meals.productId");

    const totalOrders = dailyOrders.length;
    const statusCount: Record<string, number> = {};
    let totalRevenue = 0;
    let totalCost = 0;

    const dailyBreakdown: Record<string, { count: number; revenue: number; cost: number; profit: number }> = {};

    dailyOrders.forEach((order: any) => {
      let orderRevenue = order.meals.reduce((sum: number, meal: any) => sum + (meal.price || 0) * (meal.quantity || 1), 0);
      let orderCost = order.meals.reduce((sum: number, meal: any) => sum + (meal.costPrice || 0) * (meal.quantity || 1), 0);

      totalRevenue += orderRevenue;
      totalCost += orderCost;

      const dateKey = new Date(order.date).toISOString().split("T")[0];

      if (!dailyBreakdown[dateKey]) dailyBreakdown[dateKey] = { count: 0, revenue: 0, cost: 0, profit: 0 };
      dailyBreakdown[dateKey].count += 1;
      dailyBreakdown[dateKey].revenue += orderRevenue;
      dailyBreakdown[dateKey].cost += orderCost;
      dailyBreakdown[dateKey].profit += orderRevenue - orderCost;

      order.meals.forEach((meal: any) => {
        statusCount[meal.status] = (statusCount[meal.status] || 0) + 1;
      });
    });

    const dailyOrdersArray = Object.entries(dailyBreakdown)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.status(200).json({
      totalOrders,
      statusCount,
      totalRevenue: parseFloat(totalRevenue.toFixed(3)),
      totalCost: parseFloat(totalCost.toFixed(3)),
      totalProfit: parseFloat((totalRevenue - totalCost).toFixed(3)),
      dailyOrders: dailyOrdersArray,
      allOrders: dailyOrders,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Error fetching DailyOrder stats", error: err });
  }
};
// ------------------- Delete DailyOrder -------------------
export const deleteDailyOrderById = async (req: Request, res: Response) => {
  try {
    const { id: orderId } = req.params;

    const order = await DailyOrder.findById(orderId);
    if (!order) return res.status(404).json({ message: "DailyOrder not found" });

    await DailyOrder.deleteOne({ _id: order._id });

    res.status(200).json({ message: "DailyOrder deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// ------------------- Real-time notification -------------------
export const createDailyOrderNotification = async (userId: string) => {
  io.to("superadmin").emit("order_notification", { message: `New DailyOrder by user ${userId}` });
};
