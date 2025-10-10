import { Request, Response } from "express";
import { Types } from "mongoose";
import Cart from "../models/Cart";
import ProductModel, { IProduct } from "../models/Product";
import User from "../models/User";
import Restaurant from "../models/Restaurant";
import Program from "../models/Program";
import { io } from "../server";
import { createUserNotification } from "./createusernotification";

const calculateTotal = (items: { product: IProduct; quantity: number }[]) =>
  items.reduce((acc, item) => acc + item.quantity * (item.product?.costPrice || 0), 0);


// -------------------- Cart Controllers --------------------

// Add product to cart
export const addToCart = async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.params;
    const { quantity = 1 } = req.body;
    const qty = Number(quantity) || 1;

    // Find user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Find product
    const product = await ProductModel.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Find associated restaurant
        const restaurant = await Restaurant.findOne({
        $or: [
          { menu: { $in: [product._id] } },
          { popularMenu: { $in: [product._id] } }
        ]
      });

      // Find associated program
      const program = await Program.findOne({
        product: { $in: [product._id] }
      });
    // Find or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [{ product: product._id, quantity: qty }] });
    } else {
      const index = cart.items.findIndex(item => item.product.toString() === productId);
      if (index > -1) cart.items[index].quantity += qty;
      else cart.items.push({ product: product._id as Types.ObjectId, quantity: qty });
    }

    // Populate product details
    await cart.populate<{ items: { product: IProduct; quantity: number }[] }>("items.product");

    // Calculate total price
    cart.totalPrice = calculateTotal(cart.items as { product: IProduct; quantity: number }[]);

    // Save cart
    await cart.save();

    // Prepare notification metadata
    const metadata: any = { cartId: cart._id, productId };
    
    if (restaurant) metadata.restaurantId = restaurant._id;
    
    if (program) metadata.programId = program._id;

    // Create user notification
    await createUserNotification({
      userId,
      title: "Cart Updated",
      message: `Added ${qty} x ${product.name} to your cart.`,
      type: "cart",
      targetAudience: "user",
      createdBy: "system",
      channel: "inApp",
      metadata,
    });

    // Prepare response data with restaurant and program if available
    const responseData: any = { ...cart.toObject() };
    if (restaurant) responseData.restaurant = restaurant;
    if (program) responseData.program = program;

    res.status(200).json(responseData);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || err });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.params;
    const { quantity } = req.body;
    const qty = Number(quantity);

    if (isNaN(qty)) {
      return res.status(400).json({ message: "Quantity must be a number" });
    }

    // Check user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Find cart
    const cart = await Cart.findOne({ userId });
    console.log(cart);
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Find product index in cart
    const index = cart.items.findIndex(item => item.product.toString() === productId);
    console.log(index);
    if (index === -1) {
      return res.status(404).json({ message: "Product not in cart" });
    }

    // Populate product details before updating/removing
    await cart.populate<{ items: { product: IProduct; quantity: number }[] }>("items.product");
    const product = cart.items[index].product as IProduct;
    console.log(product);
    // Update or remove item
    if (qty <= 0) {
      cart.items.splice(index, 1);
    } else {
      cart.items[index].quantity = qty;
    }

    // Recalculate total
    cart.totalPrice = calculateTotal(cart.items as { product: IProduct; quantity: number }[]);
    console.log(cart);
    await cart.save();

    // 🔍 Find associated restaurant & program for metadata
    const restaurant = await Restaurant.findOne({
      $or: [
        { menu: { $in: [product._id] } },
        { popularMenu: { $in: [product._id] } }
      ]
    });

    const program = await Program.findOne({
      product: { $in: [product._id] }
    });

    // Build notification metadata
    const metadata: any = { cartId: cart._id, productId };
    if (restaurant) metadata.restaurantId = restaurant._id;
    if (program) metadata.programId = program._id;

    // Send notification
    if (product) {
      await createUserNotification({
        userId,
        title: "Cart Updated",
        message: qty <= 0
          ? `Removed ${product.name} from your cart.`
          : `Updated ${product.name} quantity to ${qty}.`,
        type: "cart",
        targetAudience: "user",
        createdBy: "system",
        channel: "inApp",
        metadata,
      });
    }

    // Build response with restaurant & program if available
    const responseData: any = { ...cart.toObject() };
    if (restaurant) responseData.restaurant = restaurant;
    if (program) responseData.program = program;

    res.status(200).json(responseData);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || err });
  }
};


// Delete cart item
export const deleteCartItem = async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    await cart.populate<{ items: { product: IProduct; quantity: number }[] }>("items.product");
    const index = cart.items.findIndex(item => item.product.id.toString() === productId);
    const productName = cart.items[index]?.product?._id;

    if (index !== -1) cart.items.splice(index, 1);

    cart.totalPrice = calculateTotal(cart.items as { product: IProduct; quantity: number }[]);
    await cart.save();

    if (productName) {
      await createUserNotification({
        userId,
        title: "Cart Updated",
        message: `Removed ${productName} from your cart.`,
        type: "cart",
        targetAudience: "user",
        createdBy: "system",
        channel: "inApp",
        metadata: { cartId: cart._id, productId },
      });
    }

    res.status(200).json(cart);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || err });
  }
};

// Get cart by user
export const getCartByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Find cart and populate products
    const cart = await Cart.findOne({ userId })
      .populate<{ items: { product: IProduct; quantity: number }[] }>("items.product");

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Build enriched items with restaurant & program details
    const enrichedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = item.product as IProduct;

        // 🔍 Find associated restaurant
        const restaurant = await Restaurant.findOne({
          $or: [
            { menu: { $elemMatch: { id: product._id } } },
            { popularMenu: { $elemMatch: { id: product._id } } }
          ]
        });

        // 🔍 Find associated program
        const program = await Program.findOne({
          product: { $elemMatch: { id: product._id } }
        });

        return {
          ...item,
          restaurant: restaurant || null,
          program: program || null,
        };
      })
    );

    // Final response
    const responseData = {
      ...cart.toObject(),
      items: enrichedItems,
    };

    res.status(200).json(responseData);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || err });
  }
};

// Optimized getFullCart
export const getFullCart = async (_req: Request, res: Response) => {
  try {
    const carts = await Cart.aggregate([
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $unwind: "$items" },
      { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "items.product" } },
      { $unwind: "$items.product" },
      {
        $lookup: {
          from: "restaurants",
          let: { productId: "$items.product._id" },
          pipeline: [
            { $match: { $expr: { $or: [{ $in: ["$$productId", "$menu"] }, { $in: ["$$productId", "$popularMenu"] }] } } },
            { $project: { name: 1, address: 1, image: 1 } },
          ],
          as: "items.restaurant",
        },
      },
      { $addFields: { "items.restaurant": { $arrayElemAt: ["$items.restaurant", 0] } } },
      {
        $lookup: {
          from: "programs",
          let: { productId: "$items.product._id" },
          pipeline: [
            { $match: { $expr: { $in: ["$$productId", "$product"] } } },
            { $project: { title: 1, description: 1 } },
          ],
          as: "items.program",
        },
      },
      { $addFields: { "items.program": { $arrayElemAt: ["$items.program", 0] } } },
      {
        $group: {
          _id: "$_id",
          user: { $first: "$user" },
          totalPrice: { $first: "$totalPrice" },
          items: { $push: "$items" },
        },
      },
      {
        $project: {
          cartId: "$_id",
          user: { _id: "$user._id", username: "$user.username", email: "$user.email", role: "$user.role", profileImage: "$user.profileImage" },
          totalPrice: 1,
          items: 1,
        },
      },
    ]);

    res.status(200).json(carts);
  } catch (err: any) {
    console.error("Error fetching full cart:", err);
    res.status(500).json({ message: "Error fetching full cart", error: err.message || err });
  }
};


export const createCartNotification = async (userId: string) => {
  io.to("superadmin").emit("cart_notification", { message: `Cart updated by user ${userId}` });
};