"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const LanguageController_1 = require("../controllers/LanguageController");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ----------------- PUBLIC ROUTES -----------------
router.get("/", LanguageController_1.getLanguages); // get all languages
router.get("/:id", LanguageController_1.getLanguageById); // get language by ID
// ----------------- PROTECTED ROUTES -----------------
// Only regular users can create a language
router.post("/", protect_1.protect, (0, auth_1.authorize)(["user"]), LanguageController_1.createLanguage);
// Only SuperAdmin can update a language
router.put("/:id", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), LanguageController_1.updateLanguage);
// Admin or SuperAdmin can delete a language
router.delete("/:id", protect_1.protect, (0, auth_1.authorize)(["admin", "superadmin"]), LanguageController_1.deleteLanguage);
exports.default = router;
