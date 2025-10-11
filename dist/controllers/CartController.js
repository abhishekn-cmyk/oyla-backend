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
exports.createCartNotification = exports.getFullCart = exports.getCartByUser = exports.deleteCartItem = exports.updateCartItem = exports.addToCart = void 0;
const Cart_1 = __importDefault(require("../models/Cart"));
const Product_1 = __importDefault(require("../models/Product"));
const User_1 = __importDefault(require("../models/User"));
const Restaurant_1 = __importDefault(require("../models/Restaurant"));
const Program_1 = __importDefault(require("../models/Program"));
const server_1 = require("../server");
const createusernotification_1 = require("./createusernotification");
const calculateTotal = (items) => items.reduce((acc, item) => { var _a; return acc + item.quantity * (((_a = item.product) === null || _a === void 0 ? void 0 : _a.costPrice) || 0); }, 0);
// -------------------- Cart Controllers --------------------
// Add product to cart
const addToCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, productId } = req.params;
        const { quantity = 1 } = req.body;
        const qty = Number(quantity) || 1;
        // Find user
        const user = yield User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        // Find product
        const product = yield Product_1.default.findById(productId);
        if (!product)
            return res.status(404).json({ message: "Product not found" });
        // Find associated restaurant
        const restaurant = yield Restaurant_1.default.findOne({
            $or: [
                { menu: { $in: [product._id] } },
                { popularMenu: { $in: [product._id] } }
            ]
        });
        // Find associated program
        const program = yield Program_1.default.findOne({
            product: { $in: [product._id] }
        });
        // Find or create cart
        let cart = yield Cart_1.default.findOne({ userId });
        if (!cart) {
            cart = new Cart_1.default({ userId, items: [{ product: product._id, quantity: qty }] });
        }
        else {
            const index = cart.items.findIndex(item => item.product.toString() === productId);
            if (index > -1)
                cart.items[index].quantity += qty;
            else
                cart.items.push({ product: product._id, quantity: qty });
        }
        // Populate product details
        yield cart.populate("items.product");
        // Calculate total price
        cart.totalPrice = calculateTotal(cart.items);
        // Save cart
        yield cart.save();
        // Prepare notification metadata
        const metadata = { cartId: cart._id, productId };
        if (restaurant)
            metadata.restaurantId = restaurant._id;
        if (program)
            metadata.programId = program._id;
        // Create user notification
        yield (0, createusernotification_1.createUserNotification)({
            userId,
            title: "Cart Updated",
            message: `Added ${qty} x ${product.name} to your cart.`,
            type: "cart",
            targetAudience: "user",
            createdBy: "system",
            channel: "inApp",
            metadata,
        });
        // Prepare response data with restaurant and program if available
        const responseData = Object.assign({}, cart.toObject());
        if (restaurant)
            responseData.restaurant = restaurant;
        if (program)
            responseData.program = program;
        res.status(200).json(responseData);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || err });
    }
});
exports.addToCart = addToCart;
// Update cart item quantity
const updateCartItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, productId } = req.params;
        const { quantity } = req.body;
        const qty = Number(quantity);
        if (isNaN(qty)) {
            return res.status(400).json({ message: "Quantity must be a number" });
        }
        // Check user
        const user = yield User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        // Find cart
        const cart = yield Cart_1.default.findOne({ userId });
        console.log(cart);
        if (!cart)
            return res.status(404).json({ message: "Cart not found" });
        // Find product index in cart
        const index = cart.items.findIndex(item => item.product.toString() === productId);
        console.log(index);
        if (index === -1) {
            return res.status(404).json({ message: "Product not in cart" });
        }
        // Populate product details before updating/removing
        yield cart.populate("items.product");
        const product = cart.items[index].product;
        console.log(product);
        // Update or remove item
        if (qty <= 0) {
            cart.items.splice(index, 1);
        }
        else {
            cart.items[index].quantity = qty;
        }
        // Recalculate total
        cart.totalPrice = calculateTotal(cart.items);
        console.log(cart);
        yield cart.save();
        // 🔍 Find associated restaurant & program for metadata
        const restaurant = yield Restaurant_1.default.findOne({
            $or: [
                { menu: { $in: [product._id] } },
                { popularMenu: { $in: [product._id] } }
            ]
        });
        const program = yield Program_1.default.findOne({
            product: { $in: [product._id] }
        });
        // Build notification metadata
        const metadata = { cartId: cart._id, productId };
        if (restaurant)
            metadata.restaurantId = restaurant._id;
        if (program)
            metadata.programId = program._id;
        // Send notification
        if (product) {
            yield (0, createusernotification_1.createUserNotification)({
                userId,
                title: "Cart Updated",
                message: qty <= 0
                    ? `Removed ${product.name} from your cart.`
                    : `Updated ${product.name} quantity to ${qty}.`,
                type: "cart",
                targetAudience: "user",
                createdBy: "system",
                channel: "inApp",
                metadata,
            });
        }
        // Build response with restaurant & program if available
        const responseData = Object.assign({}, cart.toObject());
        if (restaurant)
            responseData.restaurant = restaurant;
        if (program)
            responseData.program = program;
        res.status(200).json(responseData);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || err });
    }
});
exports.updateCartItem = updateCartItem;
// Delete cart item
const deleteCartItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { userId, productId } = req.params;
        const cart = yield Cart_1.default.findOne({ userId });
        if (!cart)
            return res.status(404).json({ message: "Cart not found" });
        yield cart.populate("items.product");
        const index = cart.items.findIndex(item => item.product.id.toString() === productId);
        const productName = (_b = (_a = cart.items[index]) === null || _a === void 0 ? void 0 : _a.product) === null || _b === void 0 ? void 0 : _b._id;
        if (index !== -1)
            cart.items.splice(index, 1);
        cart.totalPrice = calculateTotal(cart.items);
        yield cart.save();
        if (productName) {
            yield (0, createusernotification_1.createUserNotification)({
                userId,
                title: "Cart Updated",
                message: `Removed ${productName} from your cart.`,
                type: "cart",
                targetAudience: "user",
                createdBy: "system",
                channel: "inApp",
                metadata: { cartId: cart._id, productId },
            });
        }
        res.status(200).json(cart);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || err });
    }
});
exports.deleteCartItem = deleteCartItem;
// Get cart by user
const getCartByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        // Find cart and populate products
        const cart = yield Cart_1.default.findOne({ userId })
            .populate("items.product");
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        // Build enriched items with restaurant & program details
        const enrichedItems = yield Promise.all(cart.items.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            const product = item.product;
            // 🔍 Find associated restaurant
            const restaurant = yield Restaurant_1.default.findOne({
                $or: [
                    { menu: { $elemMatch: { id: product._id } } },
                    { popularMenu: { $elemMatch: { id: product._id } } }
                ]
            });
            // 🔍 Find associated program
            const program = yield Program_1.default.findOne({
                product: { $elemMatch: { id: product._id } }
            });
            return Object.assign(Object.assign({}, item), { restaurant: restaurant || null, program: program || null });
        })));
        // Final response
        const responseData = Object.assign(Object.assign({}, cart.toObject()), { items: enrichedItems });
        res.status(200).json(responseData);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || err });
    }
});
exports.getCartByUser = getCartByUser;
// Optimized getFullCart
const getFullCart = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const carts = yield Cart_1.default.aggregate([
            { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
            { $unwind: "$user" },
            { $unwind: "$items" },
            { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "items.product" } },
            { $unwind: "$items.product" },
            {
                $lookup: {
                    from: "restaurants",
                    let: { productId: "$items.product._id" },
                    pipeline: [
                        { $match: { $expr: { $or: [{ $in: ["$$productId", "$menu"] }, { $in: ["$$productId", "$popularMenu"] }] } } },
                        { $project: { name: 1, address: 1, image: 1 } },
                    ],
                    as: "items.restaurant",
                },
            },
            { $addFields: { "items.restaurant": { $arrayElemAt: ["$items.restaurant", 0] } } },
            {
                $lookup: {
                    from: "programs",
                    let: { productId: "$items.product._id" },
                    pipeline: [
                        { $match: { $expr: { $in: ["$$productId", "$product"] } } },
                        { $project: { title: 1, description: 1 } },
                    ],
                    as: "items.program",
                },
            },
            { $addFields: { "items.program": { $arrayElemAt: ["$items.program", 0] } } },
            {
                $group: {
                    _id: "$_id",
                    user: { $first: "$user" },
                    totalPrice: { $first: "$totalPrice" },
                    items: { $push: "$items" },
                },
            },
            {
                $project: {
                    cartId: "$_id",
                    user: { _id: "$user._id", username: "$user.username", email: "$user.email", role: "$user.role", profileImage: "$user.profileImage" },
                    totalPrice: 1,
                    items: 1,
                },
            },
        ]);
        res.status(200).json(carts);
    }
    catch (err) {
        console.error("Error fetching full cart:", err);
        res.status(500).json({ message: "Error fetching full cart", error: err.message || err });
    }
});
exports.getFullCart = getFullCart;
const createCartNotification = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    server_1.io.to("superadmin").emit("cart_notification", { message: `Cart updated by user ${userId}` });
});
exports.createCartNotification = createCartNotification;
