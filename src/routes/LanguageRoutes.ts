import express from "express";
import { 
  getLanguageById,
  createLanguage,
  deleteLanguage,
  getLanguages,
  updateLanguage 
} from "../controllers/LanguageController";

import { protect } from "../middleware/protect";
import { requireUser, requireAdmin, requireSuperAdmin } from "../middleware/auth";

const router = express.Router();

// ----------------- PUBLIC ROUTES -----------------
router.get('/', getLanguages);
router.get('/:id', getLanguageById);

// ----------------- PROTECTED ROUTES -----------------

// Only regular users can create a language
router.post('/', protect, requireUser, createLanguage);

// Only regular users can update a language
router.put('/:id', protect, requireSuperAdmin, updateLanguage);

// Only admin or superadmin can delete a language
router.delete('/:id', protect, requireSuperAdmin, deleteLanguage);

export default router;
