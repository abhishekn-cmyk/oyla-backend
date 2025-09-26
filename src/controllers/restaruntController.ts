import { Request, Response } from "express";
import Restaurant from "../models/Restaurant";
import Product , { IProduct } from "../models/Product";
import { Types } from "mongoose";
// -------------------- RESTAURANT CRUD --------------------

// CREATE a restaurant
export const createRestaurant = async (req: Request, res: Response) => {
  try {
    const data = {
      ...req.body,
      image: req.file ? req.file.path : undefined,
    };

    const restaurant = new Restaurant(data);
    await restaurant.save();

    res.status(201).json(restaurant);
  } catch (error) {
    console.error("Error creating restaurant:", error);
    res.status(500).json({ message: "Error creating restaurant", error });
  }
};

// GET all restaurants
export const getRestaurants = async (req: Request, res: Response) => {
  try {
    const restaurants = await Restaurant.find();
    res.json(restaurants);
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    res.status(500).json({ message: "Error fetching restaurants", error });
  }
};

// GET a single restaurant by ID
export const getRestaurantById = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    res.json(restaurant);
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    res.status(500).json({ message: "Error fetching restaurant", error });
  }
};

// UPDATE restaurant
export const updateRestaurant = async (req: Request, res: Response) => {
  try {
    const data = {
      ...req.body,
      ...(req.file && { image: req.file.path }),
    };

    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    res.json(restaurant);
  } catch (error) {
    console.error("Error updating restaurant:", error);
    res.status(500).json({ message: "Error updating restaurant", error });
  }
};

// DELETE restaurant
export const deleteRestaurant = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    res.json({ message: "Restaurant deleted successfully" });
  } catch (error) {
    console.error("Error deleting restaurant:", error);
    res.status(500).json({ message: "Error deleting restaurant", error });
  }
};

// -------------------- MENU PRODUCTS --------------------

// Parse product fields safely
// Helper function to parse product fields


// Add product to menu
const parseProductFields = (body: any, file?: Express.Multer.File): Partial<IProduct> => ({
  name: body.name,
  tagline: body.tagline || "",
  description: body.description || "",
  price: Number(body.price) || 0,
  category: body.category || "main",
  features: body.features ? body.features.split(",") : [],
  mealType: body.mealType || "veg",
  nutrition: body.nutrition ? JSON.parse(body.nutrition) : {},
  ingredients: body.ingredients ? JSON.parse(body.ingredients) : [],
  availableDates: body.availableDates ? JSON.parse(body.availableDates) : [],
  image: file?.path,
  stock: Number(body.stock) || 0,
});

// Add product to menu
export const addProductToMenu = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    // Save product first
    const productData = parseProductFields(req.body, req.file);
    const product = new Product(productData);
    await product.save();

    // Push product ID only
    restaurant.menu.push(product._id as Types.ObjectId);

    if (req.body.isPopular) {
      restaurant.popularMenu.push(product._id as Types.ObjectId);
    }

    await restaurant.save();

    res.status(201).json({ restaurant, product });
  } catch (error) {
    console.error("Error adding product to menu:", error);
    res.status(500).json({ message: "Error adding product to menu", error });
  }
};

// Add product directly to popular menu
export const addProductToPopularMenu = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const productData = parseProductFields(req.body, req.file);
    const product = new Product(productData);
    await product.save();

    // Only push the product ID
    restaurant.popularMenu.push(product._id as Types.ObjectId);

    await restaurant.save();

    res.status(201).json({ restaurant, product });
  } catch (error) {
    console.error("Error adding product to popular menu:", error);
    res.status(500).json({ message: "Error adding product to popular menu", error });
  }
};
