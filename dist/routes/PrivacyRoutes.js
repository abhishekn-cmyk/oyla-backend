"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const privacyController_1 = require("../controllers/privacyController");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ------------------ SUPERADMIN ROUTES ------------------
// Create a privacy policy
router.post("/create", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), privacyController_1.createPrivacyPolicy);
// Update a privacy policy
router.put("/update/:policyId", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), privacyController_1.updatePrivacyPolicy);
// ------------------ USER / PUBLIC ROUTES ------------------
// Get active privacy policy
router.get("/active", protect_1.protect, (0, auth_1.authorize)(["User"]), privacyController_1.getActivePrivacyPolicy);
// Get all privacy policies
router.get("/all", privacyController_1.getAllPrivacyPolicies);
// Delete a privacy policy
router.delete("/delete/:policyId", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), privacyController_1.deletePrivacyPolicy);
exports.default = router;
