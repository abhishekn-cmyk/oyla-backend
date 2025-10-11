"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addProductToPopularMenu = exports.addProductToMenu = exports.deleteRestaurant = exports.updateRestaurant = exports.getRestaurantById = exports.getRestaurants = exports.createRestaurant = void 0;
const Restaurant_1 = __importDefault(require("../models/Restaurant"));
// -------------------- RESTAURANT CRUD --------------------
// CREATE a restaurant
const createRestaurant = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = Object.assign(Object.assign({}, req.body), { image: req.file ? req.file.path : undefined });
        const restaurant = new Restaurant_1.default(data);
        yield restaurant.save();
        res.status(201).json(restaurant);
    }
    catch (error) {
        console.error("Error creating restaurant:", error);
        res.status(500).json({ message: "Error creating restaurant", error });
    }
});
exports.createRestaurant = createRestaurant;
// GET all restaurants
const getRestaurants = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const restaurants = yield Restaurant_1.default.find();
        res.json(restaurants);
    }
    catch (error) {
        console.error("Error fetching restaurants:", error);
        res.status(500).json({ message: "Error fetching restaurants", error });
    }
});
exports.getRestaurants = getRestaurants;
// GET a single restaurant by ID
const getRestaurantById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const restaurant = yield Restaurant_1.default.findById(req.params.id);
        if (!restaurant)
            return res.status(404).json({ message: "Restaurant not found" });
        res.json(restaurant);
    }
    catch (error) {
        console.error("Error fetching restaurant:", error);
        res.status(500).json({ message: "Error fetching restaurant", error });
    }
});
exports.getRestaurantById = getRestaurantById;
// UPDATE restaurant
const updateRestaurant = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = Object.assign(Object.assign({}, req.body), (req.file && { image: req.file.path }));
        const restaurant = yield Restaurant_1.default.findByIdAndUpdate(req.params.id, data, { new: true });
        if (!restaurant)
            return res.status(404).json({ message: "Restaurant not found" });
        res.json(restaurant);
    }
    catch (error) {
        console.error("Error updating restaurant:", error);
        res.status(500).json({ message: "Error updating restaurant", error });
    }
});
exports.updateRestaurant = updateRestaurant;
// DELETE restaurant
const deleteRestaurant = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const restaurant = yield Restaurant_1.default.findByIdAndDelete(req.params.id);
        if (!restaurant)
            return res.status(404).json({ message: "Restaurant not found" });
        res.json({ message: "Restaurant deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting restaurant:", error);
        res.status(500).json({ message: "Error deleting restaurant", error });
    }
});
exports.deleteRestaurant = deleteRestaurant;
// -------------------- MENU PRODUCTS --------------------
// Parse product fields safely
// Helper function to parse product fields
// Add product to menu
const parseProductFields = (body, file) => ({
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
    availableDays: body.availableDays,
    image: file === null || file === void 0 ? void 0 : file.path,
    stock: Number(body.stock) || 0,
});
// Add product to menu
const addProductToMenu = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const restaurant = yield Restaurant_1.default.findById(req.params.restaurantId);
        if (!restaurant)
            return res.status(404).json({ message: "Restaurant not found" });
        // Save product first
        const productData = parseProductFields(req.body, req.file);
        // Push product ID only
        restaurant.menu.push(productData._id);
        if (req.body.isPopular) {
            restaurant.popularMenu.push(productData._id);
        }
        yield restaurant.save();
        res.status(201).json({ restaurant, product: productData });
    }
    catch (error) {
        console.error("Error adding product to menu:", error);
        res.status(500).json({ message: "Error adding product to menu", error });
    }
});
exports.addProductToMenu = addProductToMenu;
// Add product directly to popular menu
const addProductToPopularMenu = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const restaurant = yield Restaurant_1.default.findById(req.params.restaurantId);
        if (!restaurant)
            return res.status(404).json({ message: "Restaurant not found" });
        const productData = parseProductFields(req.body, req.file);
        // Only push the product ID
        restaurant.popularMenu.push(productData._id);
        yield restaurant.save();
        res.status(201).json({ restaurant, product: productData });
    }
    catch (error) {
        console.error("Error adding product to popular menu:", error);
        res.status(500).json({ message: "Error adding product to popular menu", error });
    }
});
exports.addProductToPopularMenu = addProductToPopularMenu;
