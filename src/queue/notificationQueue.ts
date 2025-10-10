import Queue from "bull";
import Notification from "../models/Notification";
import User from "../models/User";
import { sendPushNotification } from "../services/pushService";
import { sendEmail } from "../services/emailService";
import { sendSMS } from "../services/smsService";
import mongoose from "mongoose";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

interface NotificationJobData {
  notificationId: string;
}

export const notificationQueue = new Queue<NotificationJobData>("notificationQueue", REDIS_URL);

// Process jobs
notificationQueue.process(async (job) => {
  const { notificationId } = job.data;

  const notification = await Notification.findById(notificationId);
  if (!notification) return;

  // Determine recipients
  let recipients: { _id: mongoose.Types.ObjectId; email?: string; phone?: string; fcmToken?: string }[] = [];
  const { targetAudience, specificUsers, channels, title, message, metadata } = notification;

  switch (targetAudience) {
    case "all":
      recipients = await User.find({}, "_id email phone fcmToken");
      break;
    case "specific_users":
      if (specificUsers?.length) recipients = await User.find({ _id: { $in: specificUsers } }, "_id email phone fcmToken");
      break;
    case "customers":
      recipients = await User.find({ role: "user" }, "_id email phone fcmToken");
      break;
    case "delivery_partners":
      recipients = await User.find({ role: "delivery_partner" }, "_id email phone fcmToken");
      break;
    case "admins":
      recipients = await User.find({ role: "admin" }, "_id email phone fcmToken");
      break;
  }

  // Send notifications
  for (const user of recipients) {
    if ((channels?.push || channels?.inApp) && user.fcmToken) {
      await sendPushNotification(user._id, { title, message, metadata });
    }
    if (channels?.email && user.email) await sendEmail(user.email, title, message);
    if (channels?.sms && user.phone) await sendSMS(user.phone, message);
  }

  // Update stats
  notification.stats = notification.stats || { totalSent: 0, delivered: 0, opened: 0, clicked: 0 };
  notification.stats.totalSent = recipients.length;
  notification.stats.delivered = recipients.length;
  notification.status = "sent";
  notification.sentAt = new Date();

  await notification.save();
});
