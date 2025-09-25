import { Request, Response } from "express";
import Program from "../models/Program";

// Create Program
export const createProgram = async (req: Request, res: Response) => {
  try {
    const { title, subtitle, tagline, description, category } = req.body;
    const image = req.file ? req.file.path : undefined;

    const program = new Program({ title, subtitle, tagline, description, category, image });
    await program.save();

    res.status(201).json({ message: "Program created", program });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
};

// Get All Programs
export const getPrograms = async (req: Request, res: Response) => {
  try {
    const programs = await Program.find();
    res.status(200).json(programs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
};

// Update Program
export const updateProgram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, subtitle, tagline, description, category } = req.body;
    const image = req.file ? req.file.path : undefined;

    const program = await Program.findByIdAndUpdate(
      id,
      { title, subtitle, tagline, description, category, ...(image && { image }) },
      { new: true }
    );

    if (!program) return res.status(404).json({ message: "Program not found" });

    res.status(200).json({ message: "Program updated", program });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
};

// Delete Program
export const deleteProgram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const program = await Program.findByIdAndDelete(id);

    if (!program) return res.status(404).json({ message: "Program not found" });

    res.status(200).json({ message: "Program deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
};


export const searchPrograms = async (req: Request, res: Response) => {
  try {
    const { search, category } = req.query;

    // Build query object
    const query: any = {};

    // Filter by category if provided
    if (category) {
      query.category = category;
    }

    // Search by title or tagline (case-insensitive)
    if (search) {
      query.$or = [
        { title: { $regex: search as string, $options: "i" } },
        { tagline: { $regex: search as string, $options: "i" } },
      ];
    }

    const programs = await Program.find(query);

    res.status(200).json(programs);
  } catch (err) {
    console.error("Error searching programs:", err);
    res.status(500).json({ error: err });
  }
};


