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
} from "../controllers/ProductController";
import { upload } from "../middleware/upload";
import { protect } from "../middleware/protect";
import { requireSuperAdmin } from "../middleware/auth";

const router = express.Router();

// ----------------- PUBLIC ROUTES -----------------
router.get("/", getProducts);
router.get('/:id',getProductById);
router.get('/search',searchProduct);

// ----------------- PROTECTED ROUTES (SUPERADMIN ONLY) -----------------

// Standalone products
router.post("/", protect, requireSuperAdmin, upload.single("image"), createProduct);
router.put("/:id", protect, requireSuperAdmin, upload.single("image"), updateProduct);
router.delete("/:id", protect, requireSuperAdmin, deleteProduct);

// Program products
router.get("/product/:programId",getProductsByProgram);
router.post("/program/:programId", protect, requireSuperAdmin, upload.single("image"), addProgramProduct);
router.put(
  "/program/:programId/product/:productId",
  protect,
  requireSuperAdmin,
  upload.single("image"),
  updateProgramProduct
);

router.delete(
  "/program/:programId/product/:productId",
  protect,
  requireSuperAdmin,
  deleteProgramProduct
);
export default router;
