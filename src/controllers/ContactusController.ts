import { Request, Response } from "express";
import ContactUs from "../models/Contactus";

// Add a new contact message
export const addContactMessage = async (req: Request, res: Response) => {
  try {
    const contact = new ContactUs(req.body);
    await contact.save();
    res.status(201).json(contact);
  } catch (err: any) {
    // Mongoose validation errors
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || err });
  }
};

// Update a contact message by ID
export const updateContactMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Use runValidators: true to enforce schema validations on update
    const updatedContact = await ContactUs.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedContact) {
      return res.status(404).json({ message: "Contact message not found" });
    }

    res.status(200).json(updatedContact);
  } catch (err: any) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || err });
  }
};

// Get all contact messages
export const getAllContactMessages = async (_req: Request, res: Response) => {
  try {
    const contacts = await ContactUs.find().sort({ createdAt: -1 }); // latest first
    res.status(200).json(contacts);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// Get a single contact message by ID
export const getContactMessageById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contact = await ContactUs.findById(id);

    if (!contact) {
      return res.status(404).json({ message: "Contact message not found" });
    }

    res.status(200).json(contact);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};
