import { Router, Request, Response } from "express";
import Language from "../models/Language";

const router = Router();

// CREATE a new language
export const createLanguage = async (req: Request, res: Response) => {
  try {
    const { name, proficiency } = req.body;
    const language = new Language({ name, proficiency });
    await language.save();
    res.status(201).json({ success: true, language });
  } catch (err) {
    res.status(400).json({ success: false, message: (err as Error).message });
  }
};

// READ all languages
export const getLanguages = async (_req: Request, res: Response) => {
  try {
    const languages = await Language.find();
    res.status(200).json({ success: true, languages });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// READ a single language by ID
export const getLanguageById = async (req: Request, res: Response) => {
  try {
    const language = await Language.findById(req.params.id);
    if (!language)
      return res.status(404).json({ success: false, message: "Language not found" });
    res.status(200).json({ success: true, language });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// UPDATE a language by ID
export const updateLanguage = async (req: Request, res: Response) => {
  try {
    const { name, proficiency } = req.body;
    const language = await Language.findByIdAndUpdate(
      req.params.id,
      { name, proficiency },
      { new: true, runValidators: true }
    );
    if (!language)
      return res.status(404).json({ success: false, message: "Language not found" });
    res.status(200).json({ success: true, language });
  } catch (err) {
    res.status(400).json({ success: false, message: (err as Error).message });
  }
};

// DELETE a language by ID
export const deleteLanguage = async (req: Request, res: Response) => {
  try {
    const language = await Language.findByIdAndDelete(req.params.id);
    if (!language)
      return res.status(404).json({ success: false, message: "Language not found" });
    res.status(200).json({ success: true, message: "Language deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};