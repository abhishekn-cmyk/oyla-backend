"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notificationController_1 = require("../controllers/notificationController");
const auth_1 = require("../middleware/auth");
const protect_1 = require("../middleware/protect");
const router = express_1.default.Router();
// ---------------- CREATE NOTIFICATION ----------------
// Only SuperAdmin can create notifications
router.post("/", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), notificationController_1.createNotification);
// ---------------- GET ALL NOTIFICATIONS ----------------
// Only SuperAdmin
router.get("/all", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), notificationController_1.getFullNotifications);
// ---------------- GET USER NOTIFICATIONS ----------------
// Any logged-in user can get their notifications
router.get("/me", protect_1.protect, (0, auth_1.authorize)(["user", "superadmin"]), notificationController_1.getUserNotifications);
// ---------------- UPDATE NOTIFICATION ----------------
// Only SuperAdmin can update any notification
router.put("/:notificationId", protect_1.protect, (0, auth_1.authorize)(["superadmin"]), notificationController_1.updateNotification);
// ---------------- MARK NOTIFICATION AS READ ----------------
// Any logged-in user can mark their notification as read
router.put("/read/:notificationId", protect_1.protect, (0, auth_1.authorize)(["user", "superadmin"]), notificationController_1.markNotificationRead);
exports.default = router;
