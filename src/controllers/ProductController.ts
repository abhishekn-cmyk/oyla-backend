import { Request, Response } from "express";
import Product, { IProduct } from "../models/Product";
import Program from "../models/Program";
import { console } from "inspector";

// ---------- Standalone Product CRUD ----------
const parseDates = (dates: string | string[] | undefined): Date[] => {
  if (!dates) return [];
  
  if (Array.isArray(dates)) {
    return dates
      .map(d => new Date(d))
      .filter(d => !isNaN(d.getTime())); // remove invalid dates
  }

  const singleDate = new Date(dates);
  return isNaN(singleDate.getTime()) ? [] : [singleDate];
};

// Create Product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      tagline,
      description,
      price,
      rating,
      nutrition,
      ingredients,
      mealType,
      stock,
      category,
      availableDate, // This should be a JSON string from FormData
    } = req.body;

    const image = req.file ? req.file.path : undefined;

    // Parse ingredients safely
    const ingredientsArray: string[] = ingredients
      ? Array.isArray(ingredients)
        ? ingredients
        : JSON.parse(ingredients)
      : [];

    // Parse availableDates safely
    const availableDatesArray: Date[] = availableDate
      ? JSON.parse(availableDate)
          .map((d: string) => new Date(d))
          .filter((d: Date) => !isNaN(d.getTime())) // Remove invalid dates
      : [];

    const product = new Product({
      name,
      tagline,
      description,
      price,
      rating,
      nutrition: nutrition ? JSON.parse(nutrition) : undefined,
      ingredients: ingredientsArray,
      mealType,
      stock,
      category,
      availableDates: availableDatesArray,
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
    const {
      name,
      tagline,
      description,
      price,
      rating,
      nutrition,
      ingredients,
      mealType,
      stock,
      category,
      availableDate,
    } = req.body;

    const image = req.file ? req.file.path : undefined;

    const updateData: any = {
      name,
      tagline,
      description,
      price,
      rating,
      nutrition: nutrition ? JSON.parse(nutrition) : undefined,
      ingredients: ingredients ? JSON.parse(ingredients) : undefined,
      mealType,
      stock,
      category,
      ...(availableDate && {
        availableDates: Array.isArray(availableDate)
          ? availableDate.map((d: string) => new Date(d)).filter(d => !isNaN(d.getTime()))
          : [new Date(availableDate)],
      }),
      ...(image && { image }),
    };

    const updated = await Product.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ message: "Product updated", product: updated });
  } catch (err) {
    console.error("Error updating product:", err);
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
    const { search, minPrice, maxPrice, category, availableFrom, availableTo } = req.query;
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: "i" } },
        { description: { $regex: search as string, $options: "i" } },
        { category: { $regex: search as string, $options: "i" } }
      ];
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (category) {
      query.category = { $regex: category as string, $options: "i" };
    }

    if (availableFrom || availableTo) {
      query.availableDate = {};
      if (availableFrom) query.availableDate.$gte = new Date(availableFrom as string);
      if (availableTo) query.availableDate.$lte = new Date(availableTo as string);
    }

    const products = await Product.find(query);
    res.status(200).json(products);
  } catch (err) {
    console.error("Error searching products:", err);
    res.status(500).json({ error: err });
  }
};

// Get Products by Category
export const getProductsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ 
      category: { $regex: category, $options: "i" } 
    });
    res.status(200).json(products);
  } catch (err) {
    console.error("Error fetching products by category:", err);
    res.status(500).json({ error: err });
  }
};

// Get Available Products (based on date)
export const getAvailableProducts = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    
    const products = await Product.find({
      $or: [
        { availableDate: { $exists: false } },
        { availableDate: null },
        { availableDate: { $lte: targetDate } }
      ]
    });
    
    res.status(200).json(products);
  } catch (err) {
    console.error("Error fetching available products:", err);
    res.status(500).json({ error: err });
  }
};

// ---------- Program Products CRUD ----------

// Add product to a program
// Add product to a program
export const addProgramProduct = async (req: Request, res: Response) => {
  console.log("addProgramProduct called");
  console.log("Request Body:", req.body);
  console.log("Request File:", req.file);
  console.log("Program ID:", req.params.programId);

  try {
    const { programId } = req.params;

    // Validate programId exists
    if (!programId) {
      return res.status(400).json({ message: "Program ID is required" });
    }

    const {
      name,
      tagline,
      stock,
      description,
      price,
      rating,
      nutrition,
      ingredients,
      mealType,
      category,
      availableDate,
    } = req.body;

    const image = req.file ? req.file.path : undefined;

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    // ---------- PARSE nutrition, ingredients, mealType ----------
    let parsedNutrition;
    if (nutrition) {
      try {
        parsedNutrition = typeof nutrition === "string" ? JSON.parse(nutrition) : nutrition;
      } catch (parseError) {
        console.error("Error parsing nutrition:", parseError);
        return res.status(400).json({ message: "Invalid nutrition format" });
      }
    }

    let parsedIngredients;
    if (ingredients) {
      try {
        parsedIngredients = typeof ingredients === "string" ? JSON.parse(ingredients) : ingredients;
      } catch (parseError) {
        console.error("Error parsing ingredients:", parseError);
        return res.status(400).json({ message: "Invalid ingredients format" });
      }
    }

    // let parsedMealType;
    // if (mealType) {
    //   try {
    //     parsedMealType = typeof mealType === "string" ? JSON.parse(mealType) : mealType;
    //   } catch (parseError) {
    //     console.error("Error parsing mealType:", parseError);
    //     return res.status(400).json({ message: "Invalid mealType format" });
    //   }
    // }

    // ---------- PARSE availableDate ----------
    let availableDates: Date[] = [];
    if (availableDate) {
      try {
        const parsed = typeof availableDate === "string" ? JSON.parse(availableDate) : availableDate;
        availableDates = Array.isArray(parsed)
          ? parsed.map((d: string) => new Date(d)).filter(d => !isNaN(d.getTime()))
          : [new Date(parsed)].filter(d => !isNaN(d.getTime()));
      } catch (parseError) {
        console.error("Error parsing availableDate:", parseError);
        // Try direct date parsing as fallback
        const singleDate = new Date(availableDate);
        if (!isNaN(singleDate.getTime())) {
          availableDates = [singleDate];
        }
      }
    }

    console.log("Parsed Dates:", availableDates);
    console.log("Parsed Nutrition:", parsedNutrition);
    console.log("Parsed Ingredients:", parsedIngredients);
    // console.log("Parsed MealType:", parsedMealType);

    // Check if program exists before creating product
    const existingProgram = await Program.findById(programId);
    if (!existingProgram) {
      return res.status(404).json({ message: "Program not found" });
    }

    // ---------- CREATE PRODUCT ----------
    const newProduct = await Product.create({
      name,
      tagline,
      description,
      price: Number(price),
      rating: rating ? Number(rating) : 0,
      nutrition: parsedNutrition,
      ingredients: parsedIngredients,
      mealType: mealType,
      stock: stock ? Number(stock) : 0,
      category,
      availableDates,
      image,
    });

    console.log("New Product Created:", newProduct);

    // ---------- ADD PRODUCT TO PROGRAM ----------
    const program = await Program.findByIdAndUpdate(
      programId,
      { $push: { product: newProduct._id } },
      { new: true }
    ).populate('product');

    console.log("Updated Program:", program);

    if (!program) {
      // Rollback: delete the product if program update fails
      await Product.findByIdAndDelete(newProduct._id);
      return res.status(404).json({ message: "Program not found after product creation" });
    }

    res.status(201).json({
      message: "Product added to program successfully",
      product: newProduct,
      program,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    res.status(500).json({ 
      message: "Error adding product", 
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
    });
  }
};

// Update product in a program
export const updateProgramProduct = async (req: Request, res: Response) => {
  try {
    const { programId, productId } = req.params;
    const {
      name,
      tagline,
      description,
      stock,
      price,
      rating,
      nutrition,
      ingredients,
      mealType,
      category,
      availableDate,
    } = req.body;
    const image = req.file ? req.file.path : undefined;

    const program = await Program.findOne({ _id: programId, product: productId });
    if (!program) return res.status(404).json({ message: "Product not found in program" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found in DB" });

    // Update fields
    if (name) product.name = name;
    if (tagline) product.tagline = tagline;
    if (description) product.description = description;
    if (price) product.price = price;
    if (stock) product.stock = stock;
    if (rating) product.rating = rating;
    if (nutrition) product.nutrition = JSON.parse(nutrition);
    if (ingredients) product.ingredients = JSON.parse(ingredients);
    if (mealType) product.mealType = JSON.parse(mealType);
    if (category) product.category = category;

    // Convert availableDate to array of valid Date objects
    if (availableDate) {
      product.availableDates = Array.isArray(availableDate)
        ? availableDate.map((d: string) => new Date(d)).filter(d => !isNaN(d.getTime()))
        : [new Date(availableDate)];
    }

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
    const program = await Program.findById(programId).populate('product');
    if (!program) return res.status(404).json({ message: "Program not found" });

    res.status(200).json({ 
      programId: program._id, 
      title: program.title, 
      products: program.product 
    });
  } catch (err) {
    console.error("Error fetching program products:", err);
    res.status(500).json({ error: err });
  }
};

// Get program products by category
export const getProgramProductsByCategory = async (req: Request, res: Response) => {
  try {
    const { programId, category } = req.params;
    
    const program = await Program.findById(programId).populate({
      path: 'product',
      match: { category: { $regex: category, $options: "i" } }
    });
    
    if (!program) return res.status(404).json({ message: "Program not found" });

    res.status(200).json({ 
      programId: program._id, 
      title: program.title, 
      category,
      products: program.product 
    });
  } catch (err) {
    console.error("Error fetching program products by category:", err);
    res.status(500).json({ error: err });
  }
};