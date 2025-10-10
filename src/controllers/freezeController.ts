import { Request, Response } from "express";
import Freeze from "../models/Freeze";
import mongoose from "mongoose";
import { createUserNotification } from "./createNotification";
// -------------------- ADD FREEZE --------------------
export const addFreeze = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { productId, freezeDate, meals } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid user or product ID" });
    }

    // Check existing freeze
    const existingFreeze = await Freeze.findOne({ userId, productId, freezeDate });
    if (existingFreeze) return res.status(400).json({ message: "Freeze already exists for this product/date" });

    // Create new freeze
    const freeze = new Freeze({
      userId,
      productId,
      freezeDate,
      meals,
      selectedDate: new Date()
    });

    // Save
    const savedFreeze = await freeze.save(); // savedFreeze is a Mongoose document

    // Populate references
    await savedFreeze.populate("userId");
    await savedFreeze.populate("productId");

    // Send real-time notification to user
    await createUserNotification(
      userId,
      "Freeze Added",
      `Your freeze for product ${productId} on ${freezeDate} has been added.`
    );

    res.status(201).json(savedFreeze);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// -------------------- UPDATE FREEZE --------------------
export const updateFreeze = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updatedFreeze = await Freeze.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    ).populate('userId').populate('productId');

    if (!updatedFreeze) return res.status(404).json({ message: "Freeze not found" });

    // Notify user
    await createUserNotification(updatedFreeze.userId._id.toString(), "Freeze Updated", `Your freeze has been updated.`);

    res.status(200).json(updatedFreeze);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// -------------------- CANCEL FREEZE --------------------
export const cancelFreeze = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const freeze = await Freeze.findByIdAndUpdate(
      id,
      { status: "cancelled" },
      { new: true }
    ).populate('userId').populate('productId');

    if (!freeze) return res.status(404).json({ message: "Freeze not found" });

    // Notify user
    await createUserNotification(freeze.userId._id.toString(), "Freeze Cancelled", `Your freeze for product ${freeze.productId._id} has been cancelled.`);

    res.status(200).json({ message: "Freeze cancelled successfully", freeze });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// -------------------- DELETE FREEZE --------------------
export const deleteFreeze = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const freeze = await Freeze.findByIdAndDelete(id).populate('userId').populate('productId');

    if (!freeze) return res.status(404).json({ message: "Freeze not found" });

    // Notify user
    await createUserNotification(freeze.userId._id.toString(), "Freeze Deleted", `Your freeze for product ${freeze.productId._id} has been deleted.`);

    res.status(200).json({ message: "Freeze deleted successfully", freeze });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// -------------------- GET FREEZES BY USER --------------------
export const getFreezesByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const freezes = await Freeze.find({ userId })
      .sort({ freezeDate: -1 })
      .populate('userId')
      .populate('productId');

    res.status(200).json(freezes);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// -------------------- GET FREEZE BY ID --------------------
export const getFreezeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const freeze = await Freeze.findById(id)
      .populate('userId')
      .populate('productId');

    if (!freeze) return res.status(404).json({ message: "Freeze not found" });

    res.status(200).json(freeze);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};

// -------------------- GET ALL FREEZES --------------------
export const getAllFreezes = async (req: Request, res: Response) => {
  try {
    const freezes = await Freeze.find()
      .sort({ freezeDate: -1 })
      .populate("userId")
      .populate("productId");

    res.status(200).json(freezes);
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
};