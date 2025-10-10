import { Types } from "mongoose";
import Notification from "../models/Notification";
import UserNotification from "../models/UserNotification";
import { io } from "../server";
interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: "cart" | "payment" | "subscription" | "delivery" | "freeze";
  targetAudience?: "user" | "all";
  createdBy?: string;
  channel?: "push" | "email" | "sms" | "inApp";
  metadata?: Record<string, any>;
}

export const createUserNotification = async (params: CreateNotificationParams) => {
  const {
    userId,
    title,
    message,
    type = "cart",
    targetAudience = "user",
    createdBy = "system",
    channel = "inApp",
    metadata = {},
  } = params;

  const notification = await Notification.create({
    title,
    message,
    type,
    targetAudience,
    createdBy,
    priority: "high",
    read: false,
    metadata,
  });

  const userNotification = await UserNotification.create({
    userId: new Types.ObjectId(userId),
    notificationId: notification._id,
    status: "sent",
    channel,
  });

  io.to(userId.toString()).emit("newNotification", { notification, userNotification });

  return { notification, userNotification };
};
