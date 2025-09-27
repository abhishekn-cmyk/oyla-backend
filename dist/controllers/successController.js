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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSuccessStory = exports.updateSuccessStory = exports.getSuccessStoryById = exports.getSuccessStories = exports.createSuccessStory = void 0;
const Success_1 = __importDefault(require("../models/Success"));
// -------------------- CREATE --------------------
const createSuccessStory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, author, role, category, tags, date, isActive, metadata, } = req.body;
        const story = new Success_1.default({
            title,
            description,
            author,
            role,
            category,
            tags,
            date,
            isActive: isActive !== null && isActive !== void 0 ? isActive : true,
            metadata,
            image: req.file ? req.file.path : undefined, // for single image
        });
        yield story.save();
        res.status(201).json(story);
    }
    catch (error) {
        console.error("Error creating success story:", error);
        res.status(500).json({ message: "Error creating success story", error });
    }
});
exports.createSuccessStory = createSuccessStory;
// -------------------- GET ALL --------------------
const getSuccessStories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stories = yield Success_1.default.find().sort({ createdAt: -1 });
        res.json(stories);
    }
    catch (error) {
        console.error("Error fetching success stories:", error);
        res.status(500).json({ message: "Error fetching success stories", error });
    }
});
exports.getSuccessStories = getSuccessStories;
// -------------------- GET BY ID --------------------
const getSuccessStoryById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const story = yield Success_1.default.findById(req.params.id);
        if (!story)
            return res.status(404).json({ message: "Success story not found" });
        res.json(story);
    }
    catch (error) {
        console.error("Error fetching success story:", error);
        res.status(500).json({ message: "Error fetching success story", error });
    }
});
exports.getSuccessStoryById = getSuccessStoryById;
// -------------------- UPDATE --------------------
const updateSuccessStory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = Object.assign(Object.assign({}, req.body), (req.file && { image: req.file.path }));
        const story = yield Success_1.default.findByIdAndUpdate(req.params.id, data, {
            new: true,
        });
        if (!story)
            return res.status(404).json({ message: "Success story not found" });
        res.json(story);
    }
    catch (error) {
        console.error("Error updating success story:", error);
        res.status(500).json({ message: "Error updating success story", error });
    }
});
exports.updateSuccessStory = updateSuccessStory;
// -------------------- DELETE --------------------
const deleteSuccessStory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const story = yield Success_1.default.findByIdAndDelete(req.params.id);
        if (!story)
            return res.status(404).json({ message: "Success story not found" });
        res.json({ message: "Success story deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting success story:", error);
        res.status(500).json({ message: "Error deleting success story", error });
    }
});
exports.deleteSuccessStory = deleteSuccessStory;
