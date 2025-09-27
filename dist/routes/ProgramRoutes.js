"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ProgramController_1 = require("../controllers/ProgramController");
const upload_1 = require("../middleware/upload");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ----------------- PUBLIC ROUTES -----------------
router.get("/", ProgramController_1.getPrograms); // Get all programs
router.get("/search", ProgramController_1.searchPrograms); // Search programs (public)
// ----------------- PROTECTED ROUTES (SUPERADMIN ONLY) -----------------
router.post("/", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), upload_1.upload.single("image"), ProgramController_1.createProgram); // Create program
router.put("/:id", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), upload_1.upload.single("image"), ProgramController_1.updateProgram); // Update program
router.delete("/:id", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), ProgramController_1.deleteProgram); // Delete program
exports.default = router;
