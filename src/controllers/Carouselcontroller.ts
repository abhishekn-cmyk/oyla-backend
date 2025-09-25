import { Request, Response } from "express";
import { Carousel } from "../models/Carousel";

// ====================
// Create Carousel Slide
// ====================
export const createCarousel = async (req: Request, res: Response) => {
  try {
    const { title, subtitle, link, isActive, order, metadata } = req.body;

    console.log("Request body:", req.body);
    console.log("Uploaded file:", req.file);

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const slide = new Carousel({
      title,
      subtitle,
      image: req.file.path, // use req.file.path, not req.body.image
      link,
      isActive: isActive ?? true,
      order: order ?? 0,
      metadata,
    });

    await slide.save();
    res.status(201).json(slide);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

// ====================
// Get All Carousel Slides
// ====================
export const getAllCarousels = async (req: Request, res: Response) => {
  try {
    const slides = await Carousel.find().sort({ order: 1 });
    res.status(200).json(slides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

// ====================
// Get Active Slides Only
// ====================
export const getActiveCarousels = async (req: Request, res: Response) => {
  try {
    const slides = await Carousel.find({ isActive: true }).sort({ order: 1 });
    res.status(200).json(slides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

// ====================
// Get Single Slide by ID
// ====================
export const getCarouselById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const slide = await Carousel.findById(id);

    if (!slide) return res.status(404).json({ message: "Slide not found" });

    res.status(200).json(slide);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

// ====================
// Update Slide
// ====================
export const updateCarousel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const slide = await Carousel.findByIdAndUpdate(id, updateData, { new: true });

    if (!slide) return res.status(404).json({ message: "Slide not found" });

    res.status(200).json(slide);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

// ====================
// Delete Slide
// ====================
export const deleteCarousel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const slide = await Carousel.findByIdAndDelete(id);

    if (!slide) return res.status(404).json({ message: "Slide not found" });

    res.status(200).json({ message: "Slide deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
};
