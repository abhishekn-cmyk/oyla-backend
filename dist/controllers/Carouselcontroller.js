"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCarousel = exports.updateCarousel = exports.getCarouselById = exports.getActiveCarousels = exports.getAllCarousels = exports.createCarousel = void 0;
const Carousel_1 = require("../models/Carousel");
// ====================
// Create Carousel Slide
// ====================
const createCarousel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, subtitle, link, isActive, order, metadata } = req.body;
        console.log("Request body:", req.body);
        console.log("Uploaded file:", req.file);
        if (!req.file) {
            return res.status(400).json({ message: "Image file is required" });
        }
        const slide = new Carousel_1.Carousel({
            title,
            subtitle,
            image: req.file.path, // use req.file.path, not req.body.image
            link,
            isActive: isActive !== null && isActive !== void 0 ? isActive : true,
            order: order !== null && order !== void 0 ? order : 0,
            metadata,
        });
        yield slide.save();
        res.status(201).json(slide);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err });
    }
});
exports.createCarousel = createCarousel;
// ====================
// Get All Carousel Slides
// ====================
const getAllCarousels = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const slides = yield Carousel_1.Carousel.find().sort({ order: 1 });
        res.status(200).json(slides);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err });
    }
});
exports.getAllCarousels = getAllCarousels;
// ====================
// Get Active Slides Only
// ====================
const getActiveCarousels = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const slides = yield Carousel_1.Carousel.find({ isActive: true }).sort({ order: 1 });
        res.status(200).json(slides);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err });
    }
});
exports.getActiveCarousels = getActiveCarousels;
// ====================
// Get Single Slide by ID
// ====================
const getCarouselById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const slide = yield Carousel_1.Carousel.findById(id);
        if (!slide)
            return res.status(404).json({ message: "Slide not found" });
        res.status(200).json(slide);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err });
    }
});
exports.getCarouselById = getCarouselById;
// ====================
// Update Slide
// ====================
const updateCarousel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const slide = yield Carousel_1.Carousel.findByIdAndUpdate(id, updateData, { new: true });
        if (!slide)
            return res.status(404).json({ message: "Slide not found" });
        res.status(200).json(slide);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err });
    }
});
exports.updateCarousel = updateCarousel;
// ====================
// Delete Slide
// ====================
const deleteCarousel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const slide = yield Carousel_1.Carousel.findByIdAndDelete(id);
        if (!slide)
            return res.status(404).json({ message: "Slide not found" });
        res.status(200).json({ message: "Slide deleted successfully" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err });
    }
});
exports.deleteCarousel = deleteCarousel;
