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
exports.getProgramFinancials = exports.getProductFinancials = exports.addProductExpense = exports.getProgramProductsByCategory = exports.getProductsByProgram = exports.deleteProgramProduct = exports.updateProgramProduct = exports.addProgramProduct = exports.getAvailableProducts = exports.getProductsByCategory = exports.searchProduct = exports.deleteProduct = exports.getProductById = exports.getProducts = exports.updateProduct = exports.createProduct = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Program_1 = __importDefault(require("../models/Program"));
const inspector_1 = require("inspector");
const Restaurant_1 = __importDefault(require("../models/Restaurant"));
// ---------- Standalone Product CRUD ----------
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, tagline, description, costPrice, basePrice, category, mealType, ingredients, nutrition, availableDays, } = req.body;
        const taglinesArray = tagline ? tagline.split(",").map((t) => t.trim()) : [];
        const product = new Product_1.default({
            name,
            taglines: taglinesArray,
            description,
            costPrice,
            basePrice,
            category,
            mealType,
            ingredients: ingredients ? JSON.parse(ingredients) : [],
            nutrition: nutrition ? JSON.parse(nutrition) : {},
            availableDays,
            image: req.file ? req.file.path : undefined,
        });
        yield product.save();
        res.status(201).json({ message: "Product created", product });
    }
    catch (err) {
        inspector_1.console.error("Error creating product:", err);
        res.status(500).json({ error: err });
    }
});
exports.createProduct = createProduct;
// Update Product
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, tagline, description, costPrice, basePrice, category, mealType, ingredients, nutrition, availableDays, } = req.body;
        const taglinesArray = tagline ? tagline.split(",").map((t) => t.trim()) : [];
        const updateData = Object.assign({ name, taglines: taglinesArray, description,
            costPrice,
            basePrice,
            category,
            mealType, ingredients: ingredients ? JSON.parse(ingredients) : [], nutrition: nutrition ? JSON.parse(nutrition) : {}, availableDays }, (req.file && { image: req.file.path }));
        const updated = yield Product_1.default.findByIdAndUpdate(id, updateData, { new: true });
        if (!updated)
            return res.status(404).json({ message: "Product not found" });
        res.status(200).json({ message: "Product updated", product: updated });
    }
    catch (err) {
        inspector_1.console.error("Error updating product:", err);
        res.status(500).json({ error: err });
    }
});
exports.updateProduct = updateProduct;
// Get All Products
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield Product_1.default.find();
        res.status(200).json(products);
    }
    catch (err) {
        res.status(500).json({ error: err });
    }
});
exports.getProducts = getProducts;
// Get Product by ID
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const product = yield Product_1.default.findById(id);
        if (!product)
            return res.status(404).json({ message: "Product not found" });
        res.status(200).json(product);
    }
    catch (err) {
        inspector_1.console.error("Error fetching product by ID:", err);
        res.status(500).json({ error: err });
    }
});
exports.getProductById = getProductById;
// Delete Product
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deleted = yield Product_1.default.findByIdAndDelete(id);
        if (!deleted)
            return res.status(404).json({ message: "Product not found" });
        // Remove from all Restaurants
        yield Restaurant_1.default.updateMany({}, { $pull: { menu: id, popularMenu: id } });
        // Remove from all Programs
        yield Program_1.default.updateMany({}, { $pull: { product: id } });
        res.status(200).json({ message: "Product deleted and removed from Restaurants/Programs" });
    }
    catch (err) {
        inspector_1.console.error("Error deleting product:", err);
        res.status(500).json({ error: err });
    }
});
exports.deleteProduct = deleteProduct;
// Search Product
const searchProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search, minPrice, maxPrice, category, availableFrom, availableTo } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } }
            ];
        }
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice)
                query.price.$gte = Number(minPrice);
            if (maxPrice)
                query.price.$lte = Number(maxPrice);
        }
        if (category) {
            query.category = { $regex: category, $options: "i" };
        }
        if (availableFrom || availableTo) {
            query.availableDate = {};
            if (availableFrom)
                query.availableDate.$gte = new Date(availableFrom);
            if (availableTo)
                query.availableDate.$lte = new Date(availableTo);
        }
        const products = yield Product_1.default.find(query);
        res.status(200).json(products);
    }
    catch (err) {
        inspector_1.console.error("Error searching products:", err);
        res.status(500).json({ error: err });
    }
});
exports.searchProduct = searchProduct;
// Get Products by Category
const getProductsByCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category } = req.params;
        const products = yield Product_1.default.find({
            category: { $regex: category, $options: "i" }
        });
        res.status(200).json(products);
    }
    catch (err) {
        inspector_1.console.error("Error fetching products by category:", err);
        res.status(500).json({ error: err });
    }
});
exports.getProductsByCategory = getProductsByCategory;
// Get Available Products (based on date)
const getAvailableProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        const products = yield Product_1.default.find({
            $or: [
                { availableDate: { $exists: false } },
                { availableDate: null },
                { availableDate: { $lte: targetDate } }
            ]
        });
        res.status(200).json(products);
    }
    catch (err) {
        inspector_1.console.error("Error fetching available products:", err);
        res.status(500).json({ error: err });
    }
});
exports.getAvailableProducts = getAvailableProducts;
// ---------- Program Products CRUD ----------
// Add product to a program
// Add product to a program
const addProgramProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    inspector_1.console.log("addProgramProduct called");
    inspector_1.console.log("Request Body:", req.body);
    inspector_1.console.log("Request File:", req.file);
    inspector_1.console.log("Program ID:", req.params.programId);
    try {
        const { programId } = req.params;
        // Validate programId exists
        if (!programId) {
            return res.status(400).json({ message: "Program ID is required" });
        }
        const { name, tagline, stock, description, price, rating, nutrition, ingredients, mealType, category, availableDate, } = req.body;
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
            }
            catch (parseError) {
                inspector_1.console.error("Error parsing nutrition:", parseError);
                return res.status(400).json({ message: "Invalid nutrition format" });
            }
        }
        let parsedIngredients;
        if (ingredients) {
            try {
                parsedIngredients = typeof ingredients === "string" ? JSON.parse(ingredients) : ingredients;
            }
            catch (parseError) {
                inspector_1.console.error("Error parsing ingredients:", parseError);
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
        let availableDates = [];
        if (availableDate) {
            try {
                const parsed = typeof availableDate === "string" ? JSON.parse(availableDate) : availableDate;
                availableDates = Array.isArray(parsed)
                    ? parsed.map((d) => new Date(d)).filter(d => !isNaN(d.getTime()))
                    : [new Date(parsed)].filter(d => !isNaN(d.getTime()));
            }
            catch (parseError) {
                inspector_1.console.error("Error parsing availableDate:", parseError);
                // Try direct date parsing as fallback
                const singleDate = new Date(availableDate);
                if (!isNaN(singleDate.getTime())) {
                    availableDates = [singleDate];
                }
            }
        }
        inspector_1.console.log("Parsed Dates:", availableDates);
        inspector_1.console.log("Parsed Nutrition:", parsedNutrition);
        inspector_1.console.log("Parsed Ingredients:", parsedIngredients);
        // console.log("Parsed MealType:", parsedMealType);
        // Check if program exists before creating product
        const existingProgram = yield Program_1.default.findById(programId);
        if (!existingProgram) {
            return res.status(404).json({ message: "Program not found" });
        }
        // ---------- CREATE PRODUCT ----------
        const newProduct = yield Product_1.default.create({
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
        inspector_1.console.log("New Product Created:", newProduct);
        // ---------- ADD PRODUCT TO PROGRAM ----------
        const program = yield Program_1.default.findByIdAndUpdate(programId, { $push: { product: newProduct._id } }, { new: true }).populate('product');
        inspector_1.console.log("Updated Program:", program);
        if (!program) {
            // Rollback: delete the product if program update fails
            yield Product_1.default.findByIdAndDelete(newProduct._id);
            return res.status(404).json({ message: "Program not found after product creation" });
        }
        res.status(201).json({
            message: "Product added to program successfully",
            product: newProduct,
            program,
        });
    }
    catch (error) {
        inspector_1.console.error("Error adding product:", error);
        // Provide more detailed error information
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        const errorStack = error instanceof Error ? error.stack : undefined;
        res.status(500).json(Object.assign({ message: "Error adding product", error: errorMessage }, (process.env.NODE_ENV === 'development' && { stack: errorStack })));
    }
});
exports.addProgramProduct = addProgramProduct;
// Update product in a program
const updateProgramProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { programId, productId } = req.params;
        const { name, tagline, description, stock, price, rating, nutrition, ingredients, mealType, category, availableDate, } = req.body;
        const image = req.file ? req.file.path : undefined;
        const program = yield Program_1.default.findOne({ _id: programId, product: productId });
        if (!program)
            return res.status(404).json({ message: "Product not found in program" });
        const product = yield Product_1.default.findById(productId);
        if (!product)
            return res.status(404).json({ message: "Product not found in DB" });
        // Update fields
        if (name)
            product.name = name;
        if (tagline)
            product.tagline = tagline;
        if (description)
            product.description = description;
        if (price)
            product.price = price;
        if (stock)
            product.stock = stock;
        if (rating)
            product.rating = rating;
        if (nutrition)
            product.nutrition = JSON.parse(nutrition);
        if (ingredients)
            product.ingredients = JSON.parse(ingredients);
        if (mealType)
            product.mealType = JSON.parse(mealType);
        if (category)
            product.category = category;
        // Convert availableDate to array of valid Date objects
        if (availableDate) {
            product.availableDates = Array.isArray(availableDate)
                ? availableDate.map((d) => new Date(d)).filter(d => !isNaN(d.getTime()))
                : [new Date(availableDate)];
        }
        if (image)
            product.image = image;
        yield product.save();
        res.status(200).json({
            message: "Program product updated successfully",
            product,
        });
    }
    catch (err) {
        inspector_1.console.error("Error updating program product:", err);
        res.status(500).json({ error: err });
    }
});
exports.updateProgramProduct = updateProgramProduct;
// Delete product from a program
const deleteProgramProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { programId, productId } = req.params;
        // Step 1: find program and ensure it contains this product
        const program = yield Program_1.default.findById(programId);
        if (!program) {
            return res.status(404).json({ message: "Program not found" });
        }
        const index = program.product.findIndex((id) => id.toString() === productId);
        if (index === -1) {
            return res.status(404).json({ message: "Product not found in program" });
        }
        // Step 2: remove productId from array
        program.product.splice(index, 1);
        yield program.save();
        res.status(200).json({
            message: "Product removed from program successfully",
            program,
        });
    }
    catch (err) {
        inspector_1.console.error("Error removing product from program:", err);
        res.status(500).json({ error: err });
    }
});
exports.deleteProgramProduct = deleteProgramProduct;
// Get all products of a program
const getProductsByProgram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { programId } = req.params;
        const program = yield Program_1.default.findById(programId).populate('product');
        if (!program)
            return res.status(404).json({ message: "Program not found" });
        res.status(200).json({
            programId: program._id,
            title: program.title,
            products: program.product
        });
    }
    catch (err) {
        inspector_1.console.error("Error fetching program products:", err);
        res.status(500).json({ error: err });
    }
});
exports.getProductsByProgram = getProductsByProgram;
// Get program products by category
const getProgramProductsByCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { programId, category } = req.params;
        const program = yield Program_1.default.findById(programId).populate({
            path: 'product',
            match: { category: { $regex: category, $options: "i" } }
        });
        if (!program)
            return res.status(404).json({ message: "Program not found" });
        res.status(200).json({
            programId: program._id,
            title: program.title,
            category,
            products: program.product
        });
    }
    catch (err) {
        inspector_1.console.error("Error fetching program products by category:", err);
        res.status(500).json({ error: err });
    }
});
exports.getProgramProductsByCategory = getProgramProductsByCategory;
// Add an expense to a product (update totalExpense)
const addProductExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Amount must be greater than 0" });
        }
        const product = yield Product_1.default.findById(productId);
        if (!product)
            return res.status(404).json({ message: "Product not found" });
        product.totalExpense = (product.totalExpense || 0) + amount;
        yield product.save();
        res.status(200).json({ message: "Expense added to product", totalExpense: product.totalExpense });
    }
    catch (err) {
        inspector_1.console.error("Error adding expense to product:", err);
        res.status(500).json({ message: err.message });
    }
});
exports.addProductExpense = addProductExpense;
// Get product financials (profit/loss) based on totalExpense
const getProductFinancials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const product = yield Product_1.default.findById(productId);
        if (!product)
            return res.status(404).json({ message: "Product not found" });
        const totalRevenue = (product.price || 0) * (product.stock || 0);
        const totalExpense = product.totalExpense || 0;
        const profit = totalRevenue - totalExpense;
        const profitPercentage = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        res.status(200).json({
            productId: product._id,
            name: product.name,
            totalRevenue,
            totalExpense,
            profit,
            profitPercentage,
        });
    }
    catch (err) {
        inspector_1.console.error("Error getting product financials:", err);
        res.status(500).json({ message: err.message });
    }
});
exports.getProductFinancials = getProductFinancials;
// Get program financials using totalExpense of each product
const getProgramFinancials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { programId } = req.params;
        const program = yield Program_1.default.findById(programId).populate("product");
        if (!program)
            return res.status(404).json({ message: "Program not found" });
        let totalRevenue = 0;
        let totalExpense = 0;
        program.product.forEach((p) => {
            const revenue = (p.price || 0) * (p.stock || 0);
            totalRevenue += revenue;
            totalExpense += p.totalExpense || 0;
        });
        const profit = totalRevenue - totalExpense;
        const profitPercentage = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        res.status(200).json({
            programId: program._id,
            title: program.title,
            totalRevenue,
            totalExpense,
            profit,
            profitPercentage,
        });
    }
    catch (err) {
        inspector_1.console.error("Error getting program financials:", err);
        res.status(500).json({ message: err.message });
    }
});
exports.getProgramFinancials = getProgramFinancials;
