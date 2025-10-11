import { Request, Response } from "express";
import { Types } from "mongoose";

import Subscription from "../models/Subscription";
import { DailyOrder } from "../models/DailyOrder";
import ProductModel from "../models/Product";
import DeliveryPartnerModel from "../models/DeliveryPartner";
import DeliveryModel from "../models/Delivery";
import User from "../models/User";
import Stripe from "stripe";
import PaymentModel from "../models/Payment";
import mongoose from "mongoose";
import Delivery from "../models/Delivery";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});
// ------------------- SUBSCRIPTION -------------------

export const createSubscription = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      userId,
      planDuration,
      mealsPerDay,
      startDate,
      mealPreferences = [], // e.g. ["breakfast", "lunch", "dinner"]
      planType,
      
    } = req.body;

    // ✅ Validate user
    const user = await User.findById(userId).session(session);
    if (!user) return res.status(401).json({ message: "User not authenticated" });

    if (!planDuration || !mealsPerDay || !startDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Fetch products based on meal preferences
    const query: any = { isActive: true };
    if (mealPreferences.length) query.mealType = { $in: mealPreferences };
    const products = await Subscription.find(query).session(session);
    if (!products.length)
      return res.status(400).json({ message: "No available products match preferences" });

    // ✅ Calculate total price and pick random meals
    let totalPrice = 0;
    const defaultMeals: Types.ObjectId[] = [];

    for (let i = 0; i < planDuration; i++) {
      for (let j = 0; j < mealsPerDay; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        defaultMeals.push(product._id as Types.ObjectId);
        totalPrice += product.price;
      }
    }

    // ✅ Apply discount
    if (planDuration === 7) totalPrice *= 0.98;
    if (planDuration === 14) totalPrice *= 0.95;
    if (planDuration === 28) totalPrice *= 0.9;

    // ✅ Create Stripe payment intent
    const amount = Math.round(totalPrice * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "inr",
      payment_method: "pm_card_visa",
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        userId: userId.toString(),
        planDuration: planDuration.toString(),
      },
    });

    // ✅ Save payment in DB
    const payment = await PaymentModel.create(
      [
        {
          userId,
          subscriptionId: null,
          amount: totalPrice,
          currency: "INR",
          gateway: "stripe",
          status: paymentIntent.status === "succeeded" ? "completed" : "pending",
          transactionId: paymentIntent.id,
        },
      ],
      { session }
    );

    // ✅ Create subscription
    const subscription = await Subscription.create(
      [
        {
          userId,
          planType: planType || "basic",
          planName: `${planDuration}-Day Plan`,
          startDate,
          endDate: new Date(
            new Date(startDate).setDate(new Date(startDate).getDate() + planDuration - 1)
          ),
          mealsPerDay,
          totalMeals: planDuration * mealsPerDay,
          consumedMeals: 0,
          remainingMeals: planDuration * mealsPerDay,
          price: totalPrice,
          currency: "INR",
          billingCycle: "monthly",
          payment: {
            gateway: "stripe",
            status: paymentIntent.status === "succeeded" ? "paid" : "pending",
            amountPaid: totalPrice,
            currency: "INR",
            transactionId: paymentIntent.id,
          },
          meals: Array.from({ length: planDuration }, (_, i) => {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            return mealPreferences.map(() => ({
              date,
              isLocked: i >= 3,
            }));
          }).flat(),
        },
      ],
      { session }
    );

    // ✅ Update payment with subscriptionId
    await PaymentModel.findByIdAndUpdate(payment[0]._id, {
      subscriptionId: subscription[0]._id,
    }).session(session);

    // ✅ Create daily orders dynamically based on mealPreferences
    const orders = [];
    for (let i = 0; i < planDuration; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
          const meals = (mealPreferences as ("breakfast" | "lunch" | "dinner")[]).map((mealType, slot) => ({
        slot: mealType,
        productId: defaultMeals[i * mealsPerDay + slot],
        status: "scheduled",
      }));


      orders.push({
        subscriptionId: subscription[0]._id,
        userId,
        date,
        meals,
      });
    }

    await DailyOrder.insertMany(orders, { session });

    // ✅ Commit
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      subscription: subscription[0],
      totalPrice,
      payment: payment[0],
      message: "Subscription created and payment captured successfully",
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Subscription creation error:", error);

    if (error?.paymentIntentId) {
      try {
        await stripe.refunds.create({ payment_intent: error.paymentIntentId });
      } catch (refundErr) {
        console.error("Error refunding failed payment:", refundErr);
      }
    }

    res.status(500).json({ message: "Error creating subscription", error: error.message });
  }
};


// ------------------- STRIPE WEBHOOK -------------------
export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // @ts-ignore
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    console.log(event);
  } catch (err: any) {
    console.log("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as any;
    const userId = paymentIntent.metadata.userId;
    const planDuration = parseInt(paymentIntent.metadata.planDuration);

    const subscription = await Subscription.findOne({ userId });
    if (subscription) {
      subscription.payment.status = "paid";
      subscription.payment.transactionId = paymentIntent.id;
      subscription.payment.amountPaid = paymentIntent.amount / 100;
      subscription.payment.paymentDate = new Date();
      await subscription.save();

      console.log(`Superadmin notified: User ${userId} paid subscription ${subscription._id}`);
    }
  }

  res.json({ received: true });
};


// ------------------- GET SUBSCRIPTIONS -------------------

export const getUserSubscriptions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // user ID from route param
    if (!id) return res.status(400).json({ message: "User ID is required" });

    const subscriptions = await Subscription.find({ userId: id }).populate("userId").lean();
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subscriptions", error });
  }
};


export const getAllSubscriptions = async (req: Request, res: Response) => {
  try {
    const subscriptions = await Subscription.find().populate("userId").lean();
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subscriptions", error });
  }
};

// ------------------- DAILY ORDERS -------------------

export const updateDailyOrder = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { meals } = req.body;

  try {
    const order = await DailyOrder.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const subscription = await Subscription.findById(order.subscriptionId);
    if (!subscription || !subscription.startDate) {
      return res.status(400).json({ message: "Invalid subscription or start date" });
    }

    // Now TypeScript knows startDate is defined
    const changeWindowEnd = new Date(subscription.startDate);
    changeWindowEnd.setDate(changeWindowEnd.getDate() + 3);

    if (new Date() > changeWindowEnd) {
      return res.status(403).json({ message: "Meal change window expired" });
    }

    order.meals = meals;
    await order.save();
    res.json({ order, message: "Meals updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating order", error });
  }
};


export const adminUpdateDailyOrder = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { meals } = req.body;

  try {
    const order = await DailyOrder.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.meals = meals;
    await order.save();
    res.json({ order, message: "Order updated by admin" });
  } catch (error) {
    res.status(500).json({ message: "Error updating order", error });
  }
};

export const getDailyOrders = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // user ID from route param
    if (!id) return res.status(400).json({ message: "User ID is required" });

    const orders = await DailyOrder.find({ userId: id })
      .populate("meals.productId")
      .populate("subscriptionId")
      .lean();

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching daily orders", error });
  }
};


// ------------------- PRODUCT / MEAL CATALOG -------------------

export const createProduct = async (req: Request, res: Response) => {
  try {
    const product = await ProductModel.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error creating product", error });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await ProductModel.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const updated = await ProductModel.findByIdAndUpdate(req.params.productId, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating product", error });
  }
};

// ------------------- DELIVERY PARTNER -------------------

export const createDeliveryPartner = async (req: Request, res: Response) => {
  try {
    const partner = await DeliveryPartnerModel.create(req.body);
    res.status(201).json(partner);
  } catch (error) {
    res.status(500).json({ message: "Error creating delivery partner", error });
  }
};

export const getDeliveryPartners = async (req: Request, res: Response) => {
  try {
    const partners = await DeliveryPartnerModel.find();
    res.json(partners);
  } catch (error) {
    res.status(500).json({ message: "Error fetching partners", error });
  }
};

export const updateDeliveryPartnerStatus = async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const { status } = req.body;

    const partner = await DeliveryPartnerModel.findById(partnerId);
    if (!partner) return res.status(404).json({ message: "Partner not found" });

    partner.currentStatus = status;
    await partner.save();
    res.json(partner);
  } catch (error) {
    res.status(500).json({ message: "Error updating partner status", error });
  }
};

// ------------------- DELIVERY -------------------

export const assignDelivery = async (req: Request, res: Response) => {
  const { deliveryId, deliveryPartnerId } = req.body;

  try {
    const delivery = await DeliveryModel.findById(deliveryId);
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    const partner = await DeliveryPartnerModel.findById(deliveryPartnerId);
    if (!partner || partner.currentStatus !== "available")
      return res.status(400).json({ message: "Partner unavailable" });

    delivery.deliveryPartnerId = deliveryPartnerId;
    delivery.status = "assigned";
    delivery.assignedAt = new Date();
    await delivery.save();

    partner.currentStatus = "busy";
    await partner.save();

    res.json({ delivery, message: "Delivery assigned successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error assigning delivery", error });
  }
};

export const updateDeliveryStatus = async (req: Request, res: Response) => {
  const { deliveryId } = req.params;
  const { status } = req.body;

  try {
    const delivery = await DeliveryModel.findById(deliveryId);
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    delivery.status = status;
    if (status === "picked_up") delivery.pickedUpAt = new Date();
    if (status === "delivered") delivery.deliveredAt = new Date();
    await delivery.save();

    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: "Error updating delivery status", error });
  }
};

// ------------------- SUBSCRIPTION MANAGEMENT -------------------

export const toggleSubscriptionStatus = async (req: Request, res: Response) => {
  const { subscriptionId } = req.params;
  const { action } = req.body; // "pause" | "resume"

  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    subscription.isPaused = action === "pause";
    await subscription.save();
    res.json({ subscription, message: `Subscription ${action}d successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error updating subscription", error });
  }
};

// ------------------- LOCK MEALS AFTER CHANGE WINDOW -------------------

export const lockMealsAfterChangeWindow = async () => {
  try {
    const subscriptions = await Subscription.find();
    for (const sub of subscriptions) {
      const lockDate = new Date(sub.startDate);
      lockDate.setDate(lockDate.getDate() + 3);

      if (new Date() > lockDate) {
        await DailyOrder.updateMany(
          { subscriptionId: sub._id },
          { $set: { "meals.$[].locked": true } }
        );
      }
    }
  } catch (error) {
    console.error("Error locking meals:", error);
  }
};

// ------------------- REVENUE REPORT -------------------

interface DelayedMeal {
  delayMinutes: number;
  productId?: string;
  productName?: string;
  mealType?: string;
  expectedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
}

interface DelayOrder {
  delayedMeals: DelayedMeal[];
}

type UserAnalytics = {
  userId: string;
  username: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
};

type DeliveryPartnerAnalytics = {
  partnerId: string;
  name: string;
  totalDeliveries: number;
  deliveredOrders: number;
  delayedDeliveries: number;
};
type SubscriptionAnalytics = {
  subscriptionId: string;
  user: { userId: string; name: string; email: string };
  subscriptionDetails: { plan: string; startDate: string; endDate: string };
  subscriptionTotal: number;
  orders: {
    orderId: string;
    date: string;
    total: number;
    meals: {
      productId: string;
      name: string;
      mealType: string;
      price: number;
      quantity: number;
      status?: string;
    }[];
  }[];
};

export const getRevenueReport = async (req: Request, res: Response) => {
  try {
    const subscriptions = await Subscription.find().populate("userId").lean();
    const allDailyOrders = await DailyOrder.find()
      .populate("userId")
      .populate("subscriptionId")
      .populate("meals.productId")
      .lean();
    const deliveryPartners = await DeliveryPartnerModel.find().lean();
   const deliveries=await Delivery.find().lean();
    let totalRevenue = 0;
    const detailedRevenue: SubscriptionAnalytics[] = [];

    // --- Subscription analytics ---
    for (const sub of subscriptions) {
      const user: any = sub.userId || {};
      const dailyOrders = allDailyOrders.filter(
        (order) => order.subscriptionId?._id?.toString() === sub._id.toString()
      );

      let subscriptionTotal = 0;
      const ordersDetails = dailyOrders.map((order: any) => {
        let orderTotal = 0;
        const mealsDetails = order.meals.map((meal: any) => {
          const product = meal.productId || {};
          const price = product.price || 0;
          orderTotal += price;
          return {
            productId: product._id,
            name: product.name,
            mealType: product.mealType,
            price,
            quantity: meal.quantity || 1,
            status: meal.status,
          };
        });

        subscriptionTotal += orderTotal;
        return {
          orderId: order._id,
          date: order.date,
          total: orderTotal,
          meals: mealsDetails,
        };
      });

      totalRevenue += subscriptionTotal;

     detailedRevenue.push({
  subscriptionId: sub._id.toString(), // convert ObjectId to string
  user: { 
    userId: user._id?.toString() || sub.userId?.toString(), 
    name: user.name || "N/A", 
    email: user.email || "N/A" 
  },
  subscriptionDetails: { 
    plan: sub.planType, 
    startDate: sub.startDate?.toISOString() || "", // convert Date to string
    endDate: sub.endDate?.toISOString() || ""      // convert Date to string
  },
  subscriptionTotal,
  orders: ordersDetails,
});

    }

    // --- User analytics ---
    const userAnalytics: UserAnalytics[] = subscriptions.map((sub: any) => {
      const userOrders = allDailyOrders.filter(
        (order) => order.userId?._id?.toString() === sub.userId?._id?.toString()
      );

      const totalSpent = userOrders.reduce(
        (sum, order) =>
          sum +
          (order.meals?.reduce(
            (s, meal) => s + ((meal.costPrice || 0) * (meal.quantity || 1)),
            0
          ) || 0),
        0
      );

      return {
        userId: sub.userId?._id,
        username: sub.userId?.name,
        email: sub.userId?.email,
        totalOrders: userOrders.length,
        totalSpent,
      };
    });

 const deliveryPartnerAnalytics: DeliveryPartnerAnalytics[] = deliveryPartners.map((partner: any) => {
  // Get all deliveries assigned to this partner
  const partnerDeliveries = deliveries.filter(
    (delivery: any) => delivery.driverId?.toString() === partner._id.toString()
  );

  // Initialize counters
  let totalDeliveries = 0;
  let deliveredOrders = 0;
  let delayedDeliveries = 0;
  let cancelledOrders = 0;

  partnerDeliveries.forEach((delivery: any) => {
    // Find the linked DailyOrder
    const order = allDailyOrders.find(
      (o: any) => o._id.toString() === delivery.orderId.toString()
    );

    if (!order) return;

    const allMealsDelivered = order.meals?.every((m: any) => m.status === "delivered") ?? false;

    // Count delivered orders: orderStatus="delivered" && paymentStatus="paid" && all meals delivered
    if (order.orderStatus === "delivered" && order.paymentStatus === "paid" && allMealsDelivered) {
      deliveredOrders++;
    }

    // Count delayed deliveries: any meal delayed OR orderStatus="delayed"
    if (order.orderStatus === "delayed" || order.meals?.some((m: any) => m.status === "delayed")) {
      delayedDeliveries++;
    }

    // Count cancelled orders
    if (order.orderStatus === "cancelled") {
      cancelledOrders++;
    }

    totalDeliveries++; // total assigned deliveries
  });

  return {
    partnerId: partner._id,
    name: partner.name,
    totalDeliveries,
    deliveredOrders,
    delayedDeliveries,
    cancelledOrders,
  };
});

    // --- Delivery delay details ---
    const delayedOrders = allDailyOrders.filter((order) => order.meals?.some((m) => m.status === "delayed"));
    const delayDetails: DelayOrder[] = delayedOrders.map((order: any) => {
      const user: any = order.userId || {};
      const delayedMeals: DelayedMeal[] = order.meals
        .filter((m: any) => m.status === "delayed")
        .map((m: any) => {
          const product = m.productId || {};
          const expected = new Date(m.expectedDeliveryTime);
          const actual = new Date(m.actualDeliveryTime);
          const delayMinutes = Math.max(0, (actual.getTime() - expected.getTime()) / (1000 * 60));
          return {
            productId: product._id,
            productName: product.name,
            mealType: product.mealType,
            expectedDeliveryTime: expected,
            actualDeliveryTime: actual,
            delayMinutes,
          };
        });

      return {
        orderId: order._id,
        user: { userId: user._id, name: user.name || "N/A", email: user.email || "N/A" },
        subscriptionId: order.subscriptionId?._id,
        date: order.date,
        delayedMeals,
      };
    });

    const totalDelayMinutes = delayDetails.reduce(
      (sum, order) => sum + order.delayedMeals.reduce((s, m) => s + m.delayMinutes, 0),
      0
    );

    const delayedMealCount = delayDetails.reduce((count, order) => count + order.delayedMeals.length, 0);
    const averageDelayMinutes = delayedMealCount ? totalDelayMinutes / delayedMealCount : 0;

    // --- RESPONSE ---
    res.json({
      totalRevenue,
      totalSubscriptions: subscriptions.length,
      totalDelayedOrders: delayedOrders.length,
      averageDelayMinutes: parseFloat(averageDelayMinutes.toFixed(2)),
      subscriptions: detailedRevenue,
      userAnalytics,
      deliveryPartnerAnalytics,
      deliveryDelays: delayDetails,
    });
  } catch (error) {
    console.error("Error generating detailed revenue report:", error);
    res.status(500).json({ message: "Error generating detailed revenue report", error });
  }
};


// ------------------- DELIVERY DELAY REPORT -------------------

export const getDeliveryDelayReport = async (req: Request, res: Response) => {
  try {
    // 1️⃣ Fetch delayed orders from DailyOrder
    const delayedOrders = await DailyOrder.find({
      $or: [
        { orderStatus: "delayed" },
        { paymentStatus: "delayed" },
        { "meals.status": "delayed" },
      ],
    })
      .populate("userId")
      .populate("subscriptionId")
      .populate("meals.productId")
      .lean();

    // 2️⃣ Fetch deliveries linked to these orders that are delayed
    const orderIds = delayedOrders.map((o) => o._id);
    const delayedDeliveries = await Delivery.find({
      orderId: { $in: orderIds },
      deliveryStatus: "delayed",
    })
      .populate("driverId") // delivery partner info
      .lean();
   
    // 3️⃣ Combine data per order if needed
    const report = delayedOrders.map((order) => {
      const deliveries = delayedDeliveries.filter(
        (d) => d.orderId.toString() === order._id.toString()
      );

      return {
        ...order,
        delayedDeliveries: deliveries,
        delayedDeliveryCount: deliveries.length,
      };
    });
    
    res.json({
      delayedOrders: report,
      count: report.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching delivery delays", error });
  }
};



// ------------------- REFUND / ISSUE RESOLUTION -------------------

export const processRefund = async (req: Request, res: Response) => {
  const { subscriptionId, reason } = req.body;
  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    subscription.status = "refunded";
    subscription.refundReason = reason;
    await subscription.save();

    res.json({ subscription, message: "Refund processed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error processing refund", error });
  }
};
