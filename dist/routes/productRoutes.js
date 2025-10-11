"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ProductController_1 = require("../controllers/ProductController");
const upload_1 = require("../middleware/upload");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ----------------- PUBLIC ROUTES -----------------
router.get("/", ProductController_1.getProducts); // Get all products
router.get("/:id", ProductController_1.getProductById); // Get single product by ID
router.get("/search", ProductController_1.searchProduct); // Search products by name/description/category/price/date
router.get("/category/:category", ProductController_1.getProductsByCategory); // Get products by category
router.get("/available", ProductController_1.getAvailableProducts); // Get products available for a given date
// ----------------- PROGRAM PRODUCTS (PUBLIC) -----------------
router.get("/program/:programId", ProductController_1.getProductsByProgram); // Get all products in a program
router.get("/program/:programId/category/:category", ProductController_1.getProgramProductsByCategory); // Get program products by category
// ----------------- PROTECTED ROUTES (SUPERADMIN ONLY) -----------------
// Standalone products
router.post("/", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), upload_1.upload.single("image"), ProductController_1.createProduct);
router.put("/:id", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), upload_1.upload.single("image"), ProductController_1.updateProduct);
router.delete("/:id", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), ProductController_1.deleteProduct);
// Program products
router.post("/program/:programId", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), upload_1.upload.single("image"), ProductController_1.addProgramProduct);
router.put("/program/:programId/product/:productId", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), upload_1.upload.single("image"), ProductController_1.updateProgramProduct);
router.delete("/program/:programId/product/:productId", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), ProductController_1.deleteProgramProduct);
router.post('/products/:productId/add-expense', ProductController_1.addProductExpense);
router.get('/products/:productId/financials', ProductController_1.getProductFinancials);
exports.default = router;
