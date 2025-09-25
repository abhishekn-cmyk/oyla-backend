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
import { authorize } from "../middleware/auth";

const router = express.Router();

// ----------------- PUBLIC ROUTES -----------------
router.get("/", getPrograms); // Get all programs
router.get("/search", searchPrograms); // Search programs (public)

// ----------------- PROTECTED ROUTES (SUPERADMIN ONLY) -----------------
router.post("/", protect, authorize(["SuperAdmin"]), upload.single("image"), createProgram); // Create program
router.put("/:id", protect, authorize(["SuperAdmin"]), upload.single("image"), updateProgram); // Update program
router.delete("/:id", protect, authorize(["SuperAdmin"]), deleteProgram); // Delete program

export default router;
