import express from "express";
import { 
  getLanguageById,
  createLanguage,
  deleteLanguage,
  getLanguages,
  updateLanguage 
} from "../controllers/LanguageController";

import { protect } from "../middleware/protect";
import { authorize } from "../middleware/auth";

const router = express.Router();

// ----------------- PUBLIC ROUTES -----------------
router.get("/", getLanguages);          // get all languages
router.get("/:id", getLanguageById);    // get language by ID

// ----------------- PROTECTED ROUTES -----------------

// Only regular users can create a language
router.post("/", protect, authorize(["User"]), createLanguage);

// Only SuperAdmin can update a language
router.put("/:id", protect, authorize(["SuperAdmin"]), updateLanguage);

// Admin or SuperAdmin can delete a language
router.delete("/:id", protect, authorize(["SuperAdmin"]), deleteLanguage);

export default router;
