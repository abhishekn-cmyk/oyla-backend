import { Types } from "mongoose";
import { io } from "../server";
import Notification from "../models/Notification";
import UserNotification from "../models/UserNotification";

// Create notification and link it to a user
export const createUserNotification = async (
  userId: string,
  title: string,
  message: string,
  channel: "push" | "email" | "sms" | "inApp" = "inApp"
) => {
  try {
    // 1️⃣ Create the notification in Notification collection
    const notification = await Notification.create({
        
      title,
      message,
      type: "cart", // or dynamic type
      priority: "high",
      read: false,
    });

    // 2️⃣ Create the user-specific notification
    const userNotification = await UserNotification.create({
     
      userId: new Types.ObjectId(userId),
      notificationId: notification._id,
      status: "sent",
      channel,
    });

    // 3️⃣ Emit real-time notification via Socket.IO
    io.to(userId).emit("newNotification", {
      notification,
      userNotification,
    });

    return { notification, userNotification };
  } catch (err) {
    console.error("Error creating user notification:", err);
    throw err;
  }
};

