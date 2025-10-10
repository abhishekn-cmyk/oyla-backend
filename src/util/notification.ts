import Notification from "../models/Notification";
import UserNotification from "../models/UserNotification"; // optional: if you keep user-specific records
import { getIO } from "./socket";
import { Types } from "mongoose";

export type RecipientType = "admin" | "driver" | "user";

interface SendNotificationParams {
  recipientType: RecipientType;
  recipientId: string; // stringified ObjectId or room id
  title: string;
  type:string;
  message: string;
  relatedDelivery?: string;
  channel?: "inApp" | "push" | "email" | "sms";
}

/**
 * Saves a Notification doc, optionally a UserNotification link, and emits via Socket.IO
 */
export const sendNotification = async (params: SendNotificationParams) => {
  const { recipientId, recipientType, title,type, message, relatedDelivery, channel = "inApp" } = params;

  // 1) create generic notification object
 const notification = await Notification.create({
  title,
  message,
 type: "delivery", // ✅ valid
  targetAudience: recipientType === "user"
    ? "customers"
    : recipientType === "driver"
    ? "delivery_partners"
    : "admins",
  channels: {
    inApp: true,
    push: false,
    email: false,
    sms: false,
  },
  createdBy: "system", // or your adminId, if applicable
  createdAt: new Date(),
});


  // 2) create user-specific notification record if you have a UserNotification model (optional)
  // Wrap in try/catch if model may not exist
  try {
    if (UserNotification) {
      await UserNotification.create({
        userId: new Types.ObjectId ? new Types.ObjectId(recipientId) : null,
        notificationId: notification._id,
        channel,
        status: "sent",
      });
    }
  } catch (err) {
    // swallow - optional model not found / schema mismatch
    // console.warn("UserNotification creation skipped:", err);
  }

  // 3) emit via socket to the recipient's room (use recipientId as room)
  try {
    const io = getIO();
    io.to(recipientId).emit("notification", notification);
  } catch (err) {
    // socket may not be initialized — that's ok, we still have DB record
    // console.warn("Socket emit failed (maybe not initialized):", err);
  }

  return notification;
};
