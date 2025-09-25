import express from "express";
import {
  addContactMessage,
  getAllContactMessages,
  getContactMessageById,
  updateContactMessage
} from "../controllers/ContactusController";

import { protect } from "../middleware/protect";
import { requireUser, requireAdmin, requireSuperAdmin } from "../middleware/auth";

const router = express.Router();

// Add a new contact message (accessible to any user or guest)
router.post("/",protect, requireSuperAdmin,  addContactMessage);

// Update a contact message (admin only)
router.put("/:id", protect, requireSuperAdmin, updateContactMessage);

// Get all contact messages (admin only)
router.get("/", protect, requireUser, getAllContactMessages);

// Get a single contact message by ID (admin only)
router.get("/:id", protect, requireUser, getContactMessageById);

export default router;
