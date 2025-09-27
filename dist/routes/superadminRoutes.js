"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const superadminController_1 = require("../controllers/superadminController");
const router = express_1.default.Router();
const upload_1 = require("../middleware/upload");
router.post("/register", superadminController_1.registerSuperAdmin);
router.post("/login", superadminController_1.loginSuperAdmin);
router.put("/update-profile/:id", upload_1.upload.single("profileImage"), superadminController_1.updateSuperAdminProfile);
router.put("/update-password/:id", superadminController_1.updateSuperAdminPassword);
exports.default = router;
