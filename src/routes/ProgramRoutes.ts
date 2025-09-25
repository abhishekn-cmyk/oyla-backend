import express from "express";
import { 
  getPrograms, 
  createProgram, 
  updateProgram, 
  deleteProgram, 
  searchPrograms
} from "../controllers/ProgramController";
import { upload } from "../middleware/upload";
import { protect } from "../middleware/protect";
import { requireSuperAdmin } from "../middleware/auth";

const router = express.Router();

// ----------------- PUBLIC ROUTES -----------------
router.get("/", getPrograms);

// ----------------- PROTECTED ROUTES (SUPERADMIN ONLY) -----------------

// Create a program with file upload
router.post("/", protect, requireSuperAdmin, upload.single("image"), createProgram);

// Update a program with file upload
router.put("/:id", protect, requireSuperAdmin, upload.single("image"), updateProgram);

// Delete a program
router.delete("/:id", protect, requireSuperAdmin, deleteProgram);
router.get('/search',searchPrograms);
export default router;

