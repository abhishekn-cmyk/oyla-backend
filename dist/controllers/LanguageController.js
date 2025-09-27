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
exports.deleteLanguage = exports.updateLanguage = exports.getLanguageById = exports.getLanguages = exports.createLanguage = void 0;
const express_1 = require("express");
const Language_1 = __importDefault(require("../models/Language"));
const router = (0, express_1.Router)();
// CREATE a new language
const createLanguage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, proficiency } = req.body;
        const language = new Language_1.default({ name, proficiency });
        yield language.save();
        res.status(201).json({ success: true, language });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
exports.createLanguage = createLanguage;
// READ all languages
const getLanguages = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const languages = yield Language_1.default.find();
        res.status(200).json({ success: true, languages });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.getLanguages = getLanguages;
// READ a single language by ID
const getLanguageById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const language = yield Language_1.default.findById(req.params.id);
        if (!language)
            return res.status(404).json({ success: false, message: "Language not found" });
        res.status(200).json({ success: true, language });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.getLanguageById = getLanguageById;
// UPDATE a language by ID
const updateLanguage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, proficiency } = req.body;
        const language = yield Language_1.default.findByIdAndUpdate(req.params.id, { name, proficiency }, { new: true, runValidators: true });
        if (!language)
            return res.status(404).json({ success: false, message: "Language not found" });
        res.status(200).json({ success: true, language });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});
exports.updateLanguage = updateLanguage;
// DELETE a language by ID
const deleteLanguage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const language = yield Language_1.default.findByIdAndDelete(req.params.id);
        if (!language)
            return res.status(404).json({ success: false, message: "Language not found" });
        res.status(200).json({ success: true, message: "Language deleted" });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.deleteLanguage = deleteLanguage;
