import { Types } from "mongoose";
import { sendEmail } from "./emailService";
import { sendPushNotification } from "./pushService";
import { sendSMS } from "./smsService";
import User from "../models/User";

export type NotificationChannel = "email" | "push" | "sms" | "all";

export interface NotificationPayload {
  title: string;
  message: string;
  metadata?: any;
}

/**
 * Central notification handler
 */
export const sendNotification = async (
  userId: Types.ObjectId,
  payload: NotificationPayload,
  channels: NotificationChannel = "all"
) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Email
    if (channels === "email" || channels === "all") {
      if (user.email) {
        await sendEmail(user.email, payload.title, payload.message);
      }
    }

    // Push
    if (channels === "push" || channels === "all") {
      await sendPushNotification(userId, payload);
    }

    // SMS
    if (channels === "sms" || channels === "all") {
      if (user.profile.mobileNumber) {
        await sendSMS(user.profile.mobileNumber, payload.message);
      }
    }

    console.log(`📢 Notification sent to ${user._id} via ${channels}`);
  } catch (err) {
    console.error("Notification error:", err);
  }
};
