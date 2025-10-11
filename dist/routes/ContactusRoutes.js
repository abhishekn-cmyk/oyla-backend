"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ContactusController_1 = require("../controllers/ContactusController");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Add a new contact message (accessible to any user or guest)
router.post("/", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), ContactusController_1.addContactMessage);
// Update a contact message (admin only)
router.put("/:id", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), ContactusController_1.updateContactMessage);
// Get all contact messages (admin only)
router.get("/", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), ContactusController_1.getAllContactMessages);
// Get a single contact message by ID (admin only)
router.get("/:id", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), ContactusController_1.getContactMessageById);
exports.default = router;
