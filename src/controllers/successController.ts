import { Request, Response } from "express";
import SuccessStory from "../models/Success";

// -------------------- CREATE --------------------
export const createSuccessStory = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      author,
      role,
      category,
      tags,
      date,
      isActive,
      metadata,
    } = req.body;

    const story = new SuccessStory({
      title,
      description,
      author,
      role,
      category,
      tags,
      date,
      isActive: isActive ?? true,
      metadata,
      image: req.file ? req.file.path : undefined, // for single image
    });

    await story.save();
    res.status(201).json(story);
  } catch (error) {
    console.error("Error creating success story:", error);
    res.status(500).json({ message: "Error creating success story", error });
  }
};

// -------------------- GET ALL --------------------
export const getSuccessStories = async (req: Request, res: Response) => {
  try {
    const stories = await SuccessStory.find().sort({ createdAt: -1 });
    res.json(stories);
  } catch (error) {
    console.error("Error fetching success stories:", error);
    res.status(500).json({ message: "Error fetching success stories", error });
  }
};

// -------------------- GET BY ID --------------------
export const getSuccessStoryById = async (req: Request, res: Response) => {
  try {
    const story = await SuccessStory.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "Success story not found" });
    res.json(story);
  } catch (error) {
    console.error("Error fetching success story:", error);
    res.status(500).json({ message: "Error fetching success story", error });
  }
};

// -------------------- UPDATE --------------------
export const updateSuccessStory = async (req: Request, res: Response) => {
  try {
    const data = {
      ...req.body,
      ...(req.file && { image: req.file.path }), // update image only if new file uploaded
    };

    const story = await SuccessStory.findByIdAndUpdate(req.params.id, data, {
      new: true,
    });

    if (!story) return res.status(404).json({ message: "Success story not found" });
    res.json(story);
  } catch (error) {
    console.error("Error updating success story:", error);
    res.status(500).json({ message: "Error updating success story", error });
  }
};

// -------------------- DELETE --------------------
export const deleteSuccessStory = async (req: Request, res: Response) => {
  try {
    const story = await SuccessStory.findByIdAndDelete(req.params.id);
    if (!story) return res.status(404).json({ message: "Success story not found" });
    res.json({ message: "Success story deleted successfully" });
  } catch (error) {
    console.error("Error deleting success story:", error);
    res.status(500).json({ message: "Error deleting success story", error });
  }
};
