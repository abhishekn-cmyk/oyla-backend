"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const successController_1 = require("../controllers/successController");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
// -------------------- PUBLIC ROUTES --------------------
router.get("/", successController_1.getSuccessStories); // get all stories
router.get("/:id", successController_1.getSuccessStoryById); // get story by ID
// -------------------- PROTECTED ROUTES --------------------
// Only logged-in + superadmin can create, update, delete
router.post("/", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), upload_1.upload.single("image"), // upload single image
successController_1.createSuccessStory);
router.put("/:id", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), upload_1.upload.single("image"), successController_1.updateSuccessStory);
router.delete("/:id", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), successController_1.deleteSuccessStory);
exports.default = router;
