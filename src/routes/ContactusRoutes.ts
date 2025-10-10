import express from "express";
import {
  addContactMessage,
  getAllContactMessages,
  getContactMessageById,
  updateContactMessage
} from "../controllers/ContactusController";

import { protect } from "../middleware/protect";
import {  authorize } from "../middleware/auth";

const router = express.Router();

// Add a new contact message (accessible to any user or guest)
router.post("/",protect,authorize(["superadmin"]) , addContactMessage);

// Update a contact message (admin only)
router.put("/:id", protect, authorize(["superadmin"]) , updateContactMessage);

// Get all contact messages (admin only)
router.get("/", protect, authorize(["superadmin"]) , getAllContactMessages);

// Get a single contact message by ID (admin only)
router.get("/:id", protect,authorize(["superadmin"]) , getContactMessageById);

export default router;
