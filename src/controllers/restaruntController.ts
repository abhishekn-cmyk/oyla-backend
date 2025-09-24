import { Request, Response } from "express";
import Restaurant from "../models/Restaurant";
import Product, { IProduct } from "../models/Product";

// CREATE a restaurant
export const createRestaurant = async (req: Request, res: Response) => {
  try {
    const data = {
      ...req.body,
      image: req.file ? req.file.path : undefined, // <-- add this
    };

    const restaurant = new Restaurant(data);
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (error) {
    res.status(500).json({ message: "Error creating restaurant", error });
  }
};


// GET all restaurants
export const getRestaurants = async (req: Request, res: Response) => {
  try {
    const restaurants = await Restaurant.find();
    res.json(restaurants);
  } catch (error) {
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
    res.status(500).json({ message: "Error fetching restaurant", error });
  }
};

// UPDATE restaurant details
export const updateRestaurant = async (req: Request, res: Response) => {
  try {
    const data = {
      ...req.body,
      ...(req.file && { image: req.file.path }), // only set image if uploaded
    };

    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    res.json(restaurant);
  } catch (error) {
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
    res.status(500).json({ message: "Error deleting restaurant", error });
  }
};


export const addProductToMenu = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const productData: Partial<IProduct> = {
      ...req.body,
      image: req.file ? req.file.path : undefined,
    };

    const product = new Product(productData);
    restaurant.menu.push(product);

    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (error) {
    res.status(500).json({ message: "Error adding product to menu", error });
  }
};

export const addProductToPopularMenu = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const productData: Partial<IProduct> = {
      ...req.body,
      image: req.file ? req.file.path : undefined,
    };

    const product = new Product(productData);
    restaurant.popularMenu.push(product);

    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (error) {
    res.status(500).json({ message: "Error adding product to popular menu", error });
  }
};

