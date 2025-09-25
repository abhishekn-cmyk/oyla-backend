import express from "express";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addProgramProduct,
  updateProgramProduct,
  deleteProgramProduct,
  getProductById,
  searchProduct,
  getProductsByProgram,
  getAvailableProducts,
  getProductsByCategory,
  getProgramProductsByCategory
} from "../controllers/ProductController";
import { upload } from "../middleware/upload";
import { protect } from "../middleware/protect";
import { requireSuperAdmin } from "../middleware/auth";

const router = express.Router();

// ----------------- PUBLIC ROUTES -----------------
router.get("/", getProducts); // Get all products
router.get("/:id", getProductById); // Get single product by ID
router.get("/search", searchProduct); // Search products by name/description/category/price/date
router.get("/category/:category", getProductsByCategory); // Get products by category
router.get("/available", getAvailableProducts); // Get products available for a given date

// ----------------- PROGRAM PRODUCTS (PUBLIC) -----------------
router.get("/program/:programId", getProductsByProgram); // Get all products in a program
router.get("/program/:programId/category/:category", getProgramProductsByCategory); // Get program products by category

// ----------------- PROTECTED ROUTES (SUPERADMIN ONLY) -----------------

// Standalone products
router.post("/", protect, requireSuperAdmin, upload.single("image"), createProduct); // Create product
router.put("/:id", protect, requireSuperAdmin, upload.single("image"), updateProduct); // Update product
router.delete("/:id", protect, requireSuperAdmin, deleteProduct); // Delete product

// Program products
router.post("/program/:programId", protect, requireSuperAdmin, upload.single("image"), addProgramProduct); // Add product to program
router.put(
  "/program/:programId/product/:productId",
  protect,
  requireSuperAdmin,
  upload.single("image"),
  updateProgramProduct
); // Update program product
router.delete(
  "/program/:programId/product/:productId",
  protect,
  requireSuperAdmin,
  deleteProgramProduct
); // Delete program product

export default router;
