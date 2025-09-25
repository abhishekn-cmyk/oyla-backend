import { Request, Response } from "express";
import { Types } from "mongoose";
import Cart from "../models/Cart";
import Product, { IProduct } from "../models/Product";
import User from "../models/User";
import Restaurant from "../models/Restaurant";
import Program from "../models/Program";

// ---- Stock utilities ----
const decreaseStock = async (productId: string, quantity: number) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");
  if (product.stock < quantity) throw new Error("Insufficient stock");
  product.stock -= quantity;
  await product.save();
  return product;
};

const increaseStock = async (productId: string, quantity: number) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");
  product.stock += quantity;
  await product.save();
  return product;
};

const updateStock = async (productId: string, prevQuantity: number, newQuantity: number) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  const diff = newQuantity - prevQuantity; // positive -> decrease, negative -> increase
  if (diff > 0 && product.stock < diff) throw new Error("Insufficient stock");

  product.stock -= diff; // if diff < 0, stock increases
  await product.save();
  return product;
};

// ---- Cart controllers ----

// Add product to cart
export const addToCart = async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.params;
    const { quantity = 1 } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Decrease stock first
    await decreaseStock(productId, quantity);

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [{ product: new Types.ObjectId(productId), quantity }] });
    } else {
      const index = cart.items.findIndex(item => item.product.toString() === productId);
      if (index > -1) {
        // Update quantity in cart
        const prevQuantity = cart.items[index].quantity;
        cart.items[index].quantity += quantity;
        await updateStock(productId, prevQuantity, cart.items[index].quantity);
      } else {
        cart.items.push({ product: new Types.ObjectId(productId), quantity });
      }
    }

    await cart.populate<{ items: { product: IProduct; quantity: number }[] }>("items.product");
    cart.totalPrice = cart.items.reduce(
      (acc, item) => acc + item.quantity * (item.product as IProduct).price,
      0
    );

    await cart.save();
    res.status(200).json(cart);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.params;
    const { quantity } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const index = cart.items.findIndex(item => item.product.toString() === productId);
    if (index === -1) return res.status(404).json({ message: "Product not in cart" });

    const prevQuantity = cart.items[index].quantity;

    if (quantity <= 0) {
      // Remove item & increase stock
      await increaseStock(productId, prevQuantity);
      cart.items.splice(index, 1);
    } else {
      // Update stock accordingly
      await updateStock(productId, prevQuantity, quantity);
      cart.items[index].quantity = quantity;
    }

    await cart.populate<{ items: { product: IProduct; quantity: number }[] }>("items.product");
    cart.totalPrice = cart.items.reduce(
      (acc, item) => acc + item.quantity * (item.product as IProduct).price,
      0
    );

    await cart.save();
    res.status(200).json(cart);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// Delete product from cart
export const deleteCartItem = async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const index = cart.items.findIndex(item => item.product.toString() === productId);
    if (index !== -1) {
      const prevQuantity = cart.items[index].quantity;
      await increaseStock(productId, prevQuantity); // restore stock
      cart.items.splice(index, 1);
    }

    await cart.populate<{ items: { product: IProduct; quantity: number }[] }>("items.product");
    cart.totalPrice = cart.items.reduce(
      (acc, item) => acc + item.quantity * (item.product as IProduct).price,
      0
    );

    await cart.save();
    res.status(200).json(cart);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// Get cart by user
export const getCartByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const cart = await Cart.findOne({ userId }).populate<{ items: { product: IProduct; quantity: number }[] }>("items.product");
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    res.status(200).json(cart);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// Get full cart details (with user, product, restaurant, program)
export const getFullCart = async (req: Request, res: Response) => {
  try {
    const carts = await Cart.find().populate<{ items: { product: any; quantity: number }[] }>("items.product");

    const fullCarts = await Promise.all(
      carts.map(async cart => {
        const user = await User.findById(cart.userId).select("-password");

        const items = await Promise.all(
          cart.items.map(async item => {
            const product = item.product;

            const restaurant = await Restaurant.findOne({
              $or: [
                { "menu._id": product._id },
                { "popularMenu._id": product._id }
              ]
            }).select("name address image");

            const program = await Program.findOne({ "product._id": product._id }).select("title description");

            return {
              quantity: item.quantity,
              product,
              restaurant: restaurant || null,
              program: program || null
            };
          })
        );

        return {
          user,
          cartId: cart._id,
          totalPrice: cart.totalPrice,
          items
        };
      })
    );

    res.status(200).json(fullCarts);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Error fetching full cart details", error: err.message || err });
  }
};
