import { Request, Response } from "express";
import Product, { IProduct } from "../models/Product";
import Program from "../models/Program";
import { console } from "inspector";

// ---------- Standalone Product CRUD ----------

// Create Product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, tagline, description, price, rating, nutrition, ingredients, mealType,stock } = req.body;
    const image = req.file ? req.file.path : undefined;

    const product = new Product({
      name,stock,
      tagline,
      description,
      price,
      rating,
      nutrition,
      ingredients,
      mealType,
      image,
    });

    await product.save();
    res.status(201).json({ message: "Product created", product });
  } catch (err) {
    console.error("Error creating product:", err);
    res.status(500).json({ error: err });
  }
};

// Get All Products
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: err });
  }
};

// Get Product by ID
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (err) {
    console.error("Error fetching product by ID:", err);
    res.status(500).json({ error: err });
  }
};

// Update Product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, tagline, description, price, rating, nutrition, ingredients, mealType,stock } = req.body;
    const image = req.file ? req.file.path : undefined;

    const updated = await Product.findByIdAndUpdate(
      id,
      { name, tagline,stock, description, price, rating, nutrition, ingredients, mealType, ...(image && { image }) },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ message: "Product updated", product: updated });
  } catch (err) {
    res.status(500).json({ error: err });
  }
};

// Delete Product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err });
  }
};

// Search Product
export const searchProduct = async (req: Request, res: Response) => {
  try {
    const { search, minPrice, maxPrice } = req.query;
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: "i" } },
        { description: { $regex: search as string, $options: "i" } },
      ];
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(query);
    res.status(200).json(products);
  } catch (err) {
    console.error("Error searching products:", err);
    res.status(500).json({ error: err });
  }
};

// ---------- Program Products CRUD ----------

// Add product to a program
export const addProgramProduct = async (req: Request, res: Response) => {
  try {
    const { programId } = req.params;
    const { name, tagline,stock, description, price, rating, nutrition, ingredients, mealType } = req.body;
    const image = req.file ? req.file.path : undefined;

    // Step 1: create the product
    const newProduct = await Product.create({
      name,stock,
      tagline,
      description,
      price,
      rating,
      nutrition: JSON.parse(nutrition),
      ingredients: JSON.parse(ingredients),
      mealType: JSON.parse(mealType),
      image,
    });

    // Step 2: directly update program products
    const program = await Program.findByIdAndUpdate(
      programId,
      { $push: { product: newProduct._id } },
      { new: true } // return updated program
    );

    if (!program) return res.status(404).json({ message: "Program not found" });

    res.status(201).json({
      message: "Product added to program successfully",
      product: newProduct,
      program,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ message: "Error adding product", error });
  }
};



// Update product in a program
export const updateProgramProduct = async (req: Request, res: Response) => {
  try {
    const { programId, productId } = req.params;
    const { name, tagline, description,stock, price, rating, nutrition, ingredients, mealType } = req.body;
    const image = req.file ? req.file.path : undefined;

    console.log("Program ID:", programId);
    console.log("Product ID:", productId);
    console.log("Request Body:", req.body);
    console.log("Uploaded Image:", image);

    // Step 1: ensure program contains this product
    const program = await Program.findOne({ _id: programId, product: productId });
    if (!program) {
      return res.status(404).json({ message: "Product not found in program" });
    }

    // Step 2: fetch product document
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found in DB" });
    }

    // Step 3: update fields if provided
    if (name) product.name = name;
    if (tagline) product.tagline = tagline;
    if (description) product.description = description;
    if (price) product.price = price;
    if(stock) product.stock=stock;
    if (rating) product.rating = rating;
    if (nutrition) product.nutrition = JSON.parse(nutrition);
    if (ingredients) product.ingredients = JSON.parse(ingredients);
    if (mealType) product.mealType = JSON.parse(mealType);
    if (image) product.image = image;

    await product.save();

    res.status(200).json({
      message: "Program product updated successfully",
      product,
    });
  } catch (err) {
    console.error("Error updating program product:", err);
    res.status(500).json({ error: err });
  }
};




// Delete product from a program
export const deleteProgramProduct = async (req: Request, res: Response) => {
  try {
    const { programId, productId } = req.params;

    // Step 1: find program and ensure it contains this product
    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const index = program.product.findIndex((id) => id.toString() === productId);
    if (index === -1) {
      return res.status(404).json({ message: "Product not found in program" });
    }

    // Step 2: remove productId from array
    program.product.splice(index, 1);
    await program.save();

    res.status(200).json({
      message: "Product removed from program successfully",
      program,
    });
  } catch (err) {
    console.error("Error removing product from program:", err);
    res.status(500).json({ error: err });
  }
};



// Get all products of a program
export const getProductsByProgram = async (req: Request, res: Response) => {
  try {
    const { programId } = req.params;
    const program = await Program.findById(programId);
    if (!program) return res.status(404).json({ message: "Program not found" });

    res.status(200).json({ programId: program._id, title: program.title, products: program.product });
  } catch (err) {
    console.error("Error fetching program products:", err);
    res.status(500).json({ error: err });
  }
};
