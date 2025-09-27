"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const CartController_1 = require("../controllers/CartController");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ------------------ User Routes ------------------
// Get user's cart
router.get("/:userId", protect_1.protect, (0, auth_1.authorize)(["User"]), CartController_1.getCartByUser);
// Add item to cart
router.post("/:productId/:userId/add", protect_1.protect, (0, auth_1.authorize)(["User"]), CartController_1.addToCart);
// Update item in cart
router.put("/:productId/:userId/update", protect_1.protect, (0, auth_1.authorize)(["User"]), CartController_1.updateCartItem);
// Delete item from cart
router.delete("/:productId/:userId/delete", protect_1.protect, (0, auth_1.authorize)(["User"]), CartController_1.deleteCartItem);
// ------------------ Admin / SuperAdmin Routes ------------------
// Get full cart details (SuperAdmin only)
router.get("/full/cart-details", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), CartController_1.getFullCart);
exports.default = router;
