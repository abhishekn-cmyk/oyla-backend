import { Request, Response } from "express";
import Cart from "../models/Cart";
import Order from "../models/Order";
import User from "../models/User";
import Restaurant from "../models/Restaurant";
import Program from "../models/Program";

import { Wallet, WalletHistory } from "../models/Wallet";

export const checkout = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { paymentMethod, shippingAddress } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const cart = await Cart.findOne({ userId }).populate("items.product");
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Cart is empty" });

    // Build order items with restaurant & program info
    const orderItems = await Promise.all(
      cart.items.map(async item => {
        const product: any = item.product;

        const restaurant = await Restaurant.findOne({
          $or: [{ "menu._id": product._id }, { "popularMenu._id": product._id }],
        }).select("_id");

        const program = await Program.findOne({
          "product._id": product._id,
        }).select("_id");

        return {
          product: product._id,
          quantity: item.quantity,
          price: product.price,
          restaurant: restaurant?._id,
          program: program?._id,
        };
      })
    );

    const totalPrice = cart.totalPrice;

    // Handle wallet payment
    if (paymentMethod === "wallet") {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || wallet.balance < totalPrice) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }

      const balanceBefore = wallet.balance;
      wallet.balance -= totalPrice;
      wallet.totalSpent += totalPrice;
      await wallet.save();

      // Wallet History entry
      const walletHistory = new WalletHistory({
        userId,
        walletId: wallet._id,
        type: "payment",
        amount: totalPrice,
        currency: wallet.currency,
        balanceBefore,
        balanceAfter: wallet.balance,
        description: `Payment for order`,
        status: "completed",
      });

      await walletHistory.save();
    }

    // Create order
    const order = new Order({
      userId,
      items: orderItems,
      totalPrice,
      status: paymentMethod === "wallet" ? "completed" : "pending",
      paymentMethod,
      shippingAddress,
    });

    await order.save();

    // Clear cart
    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    res.status(201).json(order);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || err });
  }
};

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find()
      .populate("userId", "-password")
      .populate("items.product")
      .populate({
        path: "items.restaurant",
        populate: { path: "products" },
      })
      .populate({
        path: "items.program",
        populate: { path: "products" },
      });

    res.status(200).json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

export const getOrdersByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({ userId })
      .populate("userId", "-password")
      .populate("items.product")
      .populate({
        path: "items.restaurant",
        populate: { path: "products" },
      })
      .populate({
        path: "items.program",
        populate: { path: "products" },
      });

    res.status(200).json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("userId", "-password")
      .populate("items.product")
      .populate({
        path: "items.restaurant",
        populate: { path: "products" },
      })
      .populate({
        path: "items.program",
        populate: { path: "products" },
      });

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.status(200).json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

export const getOrdersByProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const orders = await Order.find({ "items.product": productId })
      .populate("userId", "-password")
      .populate("items.product")
      .populate({
        path: "items.restaurant",
        populate: { path: "products" },
      })
      .populate({
        path: "items.program",
        populate: { path: "products" },
      });

    res.status(200).json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

export const deleteOrderById = async (req: Request, res: Response) => {
  try {
    const {id: orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Use deleteOne on the document
    await Order.deleteOne({ _id: order._id });

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};


export const toggleOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // <- match route param name
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Example toggle logic using allowed statuses
    switch (order.status) {
      case "paid":
        order.status = "shipped";
        break;
      case "shipped":
        order.status = "delivered";
        break;
      case "delivered":
        order.status = "paid"; // cycle back if you want
        break;
      case "cancelled":
        order.status = "paid"; // optional
        break;
      default:
        order.status = "paid"; // fallback
    }

    await order.save();

    res.status(200).json({ message: "Order status updated", status: order.status });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};


// Get order statistics
export const getOrderStats = async (req: Request, res: Response) => {
  try {
    // Total orders count
    const totalOrders = await Order.countDocuments();

    // Count of orders by status
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const completedOrders = await Order.countDocuments({ status: "delivered" });

    // Aggregate total revenue
    const revenueResult = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
          pendingRevenue: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$totalPrice", 0] },
          },
          completedRevenue: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$totalPrice", 0] },
          },
        },
      },
    ]);

    const totals = revenueResult[0] || { totalRevenue: 0, pendingRevenue: 0, completedRevenue: 0 };

    res.status(200).json({
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue: totals.totalRevenue,
      pendingRevenue: totals.pendingRevenue,
      completedRevenue: totals.completedRevenue,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching order stats", error });
  }
};





