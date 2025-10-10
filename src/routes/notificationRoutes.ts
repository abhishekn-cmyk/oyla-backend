import express from "express";
import {
  createNotification,
  getAllNotifications,
  getUserNotifications,
  updateNotification,
  markNotificationRead,
  getFullNotifications,
} from "../controllers/notificationController";
import { authorize } from "../middleware/auth";
import { protect } from "../middleware/protect";

const router = express.Router();

// ---------------- CREATE NOTIFICATION ----------------
// Only SuperAdmin can create notifications
router.post(
  "/",
  protect,
  authorize(["superadmin"]),
  createNotification
);

// ---------------- GET ALL NOTIFICATIONS ----------------
// Only SuperAdmin
router.get(
  "/all",
  protect,
  authorize(["superadmin"]),
  getFullNotifications
);

// ---------------- GET USER NOTIFICATIONS ----------------
// Any logged-in user can get their notifications
router.get(
  "/me",
  protect,
  authorize(["user", "superadmin"]),
  getUserNotifications
);

// ---------------- UPDATE NOTIFICATION ----------------
// Only SuperAdmin can update any notification
router.put(
  "/:notificationId",
  protect,
  authorize(["superadmin"]),
  updateNotification
);

// ---------------- MARK NOTIFICATION AS READ ----------------
// Any logged-in user can mark their notification as read
router.put(
  "/read/:notificationId",
  protect,
  authorize(["user", "superadmin"]),
  markNotificationRead
);

export default router;
