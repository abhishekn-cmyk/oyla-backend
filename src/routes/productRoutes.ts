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
  getProgramProductsByCategory,
} from "../controllers/ProductController";
import { upload } from "../middleware/upload";
import { protect } from "../middleware/protect";
import { authorize } from "../middleware/auth";

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
router.post("/", protect, authorize(["SuperAdmin"]), upload.single("image"), createProduct);
router.put("/:id", protect, authorize(["SuperAdmin"]), upload.single("image"), updateProduct);
router.delete("/:id", protect, authorize(["SuperAdmin"]), deleteProduct);

// Program products
router.post("/program/:programId", protect, authorize(["SuperAdmin"]), upload.single("image"), addProgramProduct);
router.put(
  "/program/:programId/product/:productId",
  protect,
  authorize(["SuperAdmin"]),
  upload.single("image"),
  updateProgramProduct
);
router.delete(
  "/program/:programId/product/:productId",
  protect,
  authorize(["SuperAdmin"]),
  deleteProgramProduct
);

export default router;
