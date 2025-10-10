// const decreaseStock = async (productId: string, quantity: number) => {
//   const product = await Product.findById(productId);
//   if (!product) throw new Error("Product not found");
//   if (product.stock < quantity) throw new Error("Insufficient stock");
//   product.stock -= quantity;
//   await product.save();
//   return product;
// };

// const increaseStock = async (productId: string, quantity: number) => {
//   const product = await Product.findById(productId);
//   if (!product) throw new Error("Product not found");
//   product.stock += quantity;
//   await product.save();
//   return product;
// };

// const updateStock = async (productId: string, prevQuantity: number, newQuantity: number) => {
//   const product = await Product.findById(productId);
//   if (!product) throw new Error("Product not found");

//   const diff = newQuantity - prevQuantity; // positive -> decrease, negative -> increase
//   if (diff > 0 && product.stock < diff) throw new Error("Insufficient stock");

//   product.stock -= diff; // if diff < 0, stock increases automatically
//   await product.save();
//   return product;
// };