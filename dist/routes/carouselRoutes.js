"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Carouselcontroller_1 = require("../controllers/Carouselcontroller");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
// ------------------ Admin / SuperAdmin Routes ------------------
// Create a carousel slide (SuperAdmin only)
router.post("/", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), upload_1.upload.single('image'), Carouselcontroller_1.createCarousel);
// Update a carousel slide by ID (SuperAdmin only)
router.put("/:id", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), upload_1.upload.single('image'), Carouselcontroller_1.updateCarousel);
// Delete a carousel slide by ID (SuperAdmin only)
router.delete("/:id", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), Carouselcontroller_1.deleteCarousel);
// ------------------ Public / User Routes ------------------
// Get all active carousel slides (for users)
router.get("/active", Carouselcontroller_1.getActiveCarousels);
// Get all carousel slides (SuperAdmin only)
router.get("/", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), Carouselcontroller_1.getAllCarousels);
// Get a carousel slide by ID (SuperAdmin only)
router.get("/:id", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), Carouselcontroller_1.getCarouselById);
exports.default = router;
