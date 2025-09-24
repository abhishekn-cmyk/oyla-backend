import { Request, Response } from "express";
import Cart from "../models/Cart";
import Order from "../models/Order";
import User from "../models/User";
import Restaurant from "../models/Restaurant";
import Program from "../models/Program";

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

    const order = new Order({
      userId,
      items: orderItems,
      totalPrice: cart.totalPrice,
      status: "pending",
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
    res.status(500).json({ error: err.message || err });
  }
};
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find()
      .populate("userId", "-password")
      .populate("items.product")
      .populate("items.restaurant")
      .populate("items.program");

    res.status(200).json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};
export const getOrdersByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({ userId })
      .populate("items.product")
      .populate("items.restaurant")
      .populate("items.program");

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
      .populate("items.restaurant")
      .populate("items.program");

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
      .populate("items.restaurant")
      .populate("items.program");

    res.status(200).json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};
