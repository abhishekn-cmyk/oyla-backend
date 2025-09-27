"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const freezeController_1 = require("../controllers/freezeController");
const protect_1 = require("../middleware/protect");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// -------------------- USER ROUTES -------------------- //
// Add a freeze (user can add for themselves)
router.post("/:userId", protect_1.protect, (0, auth_1.authorize)(["User"]), freezeController_1.addFreeze);
// Get all freezes for the logged-in user
router.get("/:userId", protect_1.protect, (0, auth_1.authorize)(["User"]), freezeController_1.getFreezesByUser);
// Get a specific freeze by ID for the logged-in user
router.get("/:userId/:id", protect_1.protect, (0, auth_1.authorize)(["User"]), freezeController_1.getFreezeById);
// Update a freeze by ID (user can update their own freeze)
router.put("/:userId/:id", protect_1.protect, (0, auth_1.authorize)(["User"]), freezeController_1.updateFreeze);
// Cancel a freeze (soft update status)
router.patch("/:userId/:id/cancel", protect_1.protect, (0, auth_1.authorize)(["User"]), freezeController_1.cancelFreeze);
// Delete a freeze (user can delete their own freeze)
router.delete("/:userId/:id", protect_1.protect, (0, auth_1.authorize)(["User"]), freezeController_1.deleteFreeze);
// -------------------- SUPERADMIN ROUTES -------------------- //
// Add a freeze for any user
router.post("/superadmin/:userId", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), freezeController_1.addFreeze);
// Get all freezes for any user
router.get("/superadmin/:userId", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), freezeController_1.getFreezesByUser);
// Get a single freeze by ID for any user
router.get("/superadmin/:userId/:id", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), freezeController_1.getFreezeById);
// Update a freeze for any user
router.put("/superadmin/:userId/:id", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), freezeController_1.updateFreeze);
// Cancel a freeze for any user
router.patch("/superadmin/:userId/:id/cancel", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), freezeController_1.cancelFreeze);
// Delete a freeze for any user
router.delete("/superadmin/:userId/:id", protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), freezeController_1.deleteFreeze);
router.get('/all/all/full', protect_1.protect, (0, auth_1.authorize)(["SuperAdmin"]), freezeController_1.getAllFreezes);
exports.default = router;
