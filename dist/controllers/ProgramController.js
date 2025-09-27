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
exports.searchPrograms = exports.deleteProgram = exports.updateProgram = exports.getPrograms = exports.createProgram = void 0;
const Program_1 = __importDefault(require("../models/Program"));
// Create Program
const createProgram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, subtitle, tagline, description, category } = req.body;
        const image = req.file ? req.file.path : undefined;
        const program = new Program_1.default({ title, subtitle, tagline, description, category, image });
        yield program.save();
        res.status(201).json({ message: "Program created", program });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err });
    }
});
exports.createProgram = createProgram;
// Get All Programs
const getPrograms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const programs = yield Program_1.default.find();
        res.status(200).json(programs);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err });
    }
});
exports.getPrograms = getPrograms;
// Update Program
const updateProgram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, subtitle, tagline, description, category } = req.body;
        const image = req.file ? req.file.path : undefined;
        const program = yield Program_1.default.findByIdAndUpdate(id, Object.assign({ title, subtitle, tagline, description, category }, (image && { image })), { new: true });
        if (!program)
            return res.status(404).json({ message: "Program not found" });
        res.status(200).json({ message: "Program updated", program });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err });
    }
});
exports.updateProgram = updateProgram;
// Delete Program
const deleteProgram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const program = yield Program_1.default.findByIdAndDelete(id);
        if (!program)
            return res.status(404).json({ message: "Program not found" });
        res.status(200).json({ message: "Program deleted" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err });
    }
});
exports.deleteProgram = deleteProgram;
const searchPrograms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search, category } = req.query;
        // Build query object
        const query = {};
        // Filter by category if provided
        if (category) {
            query.category = category;
        }
        // Search by title or tagline (case-insensitive)
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { tagline: { $regex: search, $options: "i" } },
            ];
        }
        const programs = yield Program_1.default.find(query);
        res.status(200).json(programs);
    }
    catch (err) {
        console.error("Error searching programs:", err);
        res.status(500).json({ error: err });
    }
});
exports.searchPrograms = searchPrograms;
