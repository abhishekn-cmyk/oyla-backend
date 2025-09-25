import { Request, Response } from "express";
import Restaurant from "../models/Restaurant";
import Product, { IProduct } from "../models/Product";

// -------------------- RESTAURANT CRUD --------------------

// CREATE a restaurant
export const createRestaurant = async (req: Request, res: Response) => {
  console.log("createRestaurant called");
  try {
    const data = {
      ...req.body,
      image: req.file ? req.file.path : undefined,
    };

    const restaurant = new Restaurant(data);
    await restaurant.save();

    console.log("New restaurant created:", restaurant);
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

// UPDATE restaurant details
export const updateRestaurant = async (req: Request, res: Response) => {
  console.log("updateRestaurant called");
  try {
    const data = {
      ...req.body,
      ...(req.file && { image: req.file.path }),
    };

    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    console.log("Updated restaurant:", restaurant);
    res.json(restaurant);
  } catch (error) {
    console.error("Error updating restaurant:", error);
    res.status(500).json({ message: "Error updating restaurant", error });
  }
};

// DELETE a restaurant
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

// Helper function to parse product fields
// Helper function to parse product fields including availableDates and category
const parseProductFields = (body: any, file?: Express.Multer.File): Partial<IProduct> => {
  let parsedNutrition, parsedIngredients, parsedMealType, availableDates: Date[] = [];

  if (body.nutrition) parsedNutrition = typeof body.nutrition === "string" ? JSON.parse(body.nutrition) : body.nutrition;
  if (body.ingredients) parsedIngredients = typeof body.ingredients === "string" ? JSON.parse(body.ingredients) : body.ingredients;
  if (body.mealType) parsedMealType = typeof body.mealType === "string" ? JSON.parse(body.mealType) : body.mealType;

  // Parse availableDates if provided
  if (body.availableDates) {
    try {
      const parsed = typeof body.availableDates === "string" ? JSON.parse(body.availableDates) : body.availableDates;
      availableDates = Array.isArray(parsed)
        ? parsed.map((d: string) => new Date(d)).filter(d => !isNaN(d.getTime()))
        : [new Date(parsed)].filter(d => !isNaN(d.getTime()));
    } catch {
      const singleDate = new Date(body.availableDates);
      if (!isNaN(singleDate.getTime())) availableDates = [singleDate];
    }
  }

  return {
    ...body,
    nutrition: parsedNutrition,
    ingredients: parsedIngredients,
    mealType: parsedMealType,
    availableDates,
    image: file ? file.path : undefined,
    category: body.category, // Ensure category is added
  };
};

// ADD product to restaurant menu
export const addProductToMenu = async (req: Request, res: Response) => {
  console.log("addProductToMenu called");
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const productData = parseProductFields(req.body, req.file);
    const product = new Product(productData);

    restaurant.menu.push(product);
    await restaurant.save();

    console.log("Added product to menu:", product);
    res.status(201).json(restaurant);
  } catch (error) {
    console.error("Error adding product to menu:", error);
    res.status(500).json({ message: "Error adding product to menu", error });
  }
};

// ADD product to popular menu
export const addProductToPopularMenu = async (req: Request, res: Response) => {
  console.log("addProductToPopularMenu called");
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const productData = parseProductFields(req.body, req.file);
    const product = new Product(productData);

    restaurant.popularMenu.push(product);
    await restaurant.save();

    console.log("Added product to popular menu:", product);
    res.status(201).json(restaurant);
  } catch (error) {
    console.error("Error adding product to popular menu:", error);
    res.status(500).json({ message: "Error adding product to popular menu", error });
  }
};


