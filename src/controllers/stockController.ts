import Product from "../models/Product";

/**
 * Decrease stock when adding to cart
 */
export const decreaseStock = async (productId: string, quantity: number) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  if (product.stock < quantity) throw new Error("Insufficient stock");

  product.stock -= quantity;
  await product.save();
  return product;
};

/**
 * Increase stock when removing from cart
 */
export const increaseStock = async (productId: string, quantity: number) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  product.stock += quantity;
  await product.save();
  return product;
};

/**
 * Update stock when updating cart quantity
 * prevQuantity: previous quantity in cart
 * newQuantity: updated quantity in cart
 */
export const updateStock = async (productId: string, prevQuantity: number, newQuantity: number) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  const diff = newQuantity - prevQuantity; // positive -> decrease, negative -> increase
  if (diff > 0 && product.stock < diff) throw new Error("Insufficient stock");

  product.stock -= diff; // will increase if diff < 0
  await product.save();
  return product;
};
