// controllers/notificationController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import Notification, { INotification } from "../models/Notification";
import User from "../models/User";
import { notificationQueue } from "../queue/notificationQueue";
import SuperAdmin from "../models/SuperAdmin";

interface AuthRequest extends Request {
  user?: any;
}

// ---------------- CREATE NOTIFICATION ----------------
export const createNotification = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      message,
      type,
      priority,
      targetAudience,
      specificUsers,
      scheduledFor,
      channels,
      metadata,
      createdBy: createdByBody,
    } = req.body;

    if (!title || !message || !type || !targetAudience) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Determine createdBy
    let createdBy = createdByBody || req.user?._id;
    if (!createdBy || !mongoose.Types.ObjectId.isValid(createdBy)) {
      return res.status(400).json({ message: "Invalid createdBy user ID" });
    }

    const notification: INotification = new Notification({
      title,
      message,
      type,
      priority: priority ?? "medium",
      targetAudience,
      specificUsers,
      scheduledFor,
      channels: {
        inApp: channels?.inApp ?? true, // only in-app now
      },
      metadata,
      createdBy,
      status:
        scheduledFor && new Date(scheduledFor) > new Date()
          ? "scheduled"
          : "sent",
      stats: { totalSent: 0, delivered: 0, opened: 0, clicked: 0 },
    });

    await notification.save();

    const io = req.app.get("io");

    // Scheduled notification
    if (scheduledFor && new Date(scheduledFor) > new Date()) {
      await notificationQueue.add(
        { notificationId: notification.id.toString() },
        { delay: new Date(scheduledFor).getTime() - Date.now() }
      );

      return res
        .status(201)
        .json({ message: "Notification scheduled", notification });
    }

    // Immediate sending
    await sendNotification(notification, io);

    res
      .status(201)
      .json({ message: "Notification sent successfully", notification });
  } catch (err: any) {
    console.error("Notification error:", err);
    res
      .status(500)
      .json({ message: "Failed to send notification", error: err.message });
  }
};

// ---------------- SEND NOTIFICATION FUNCTION ----------------
export const sendNotification = async (notification: any, io?: any) => {
  // Determine recipients
  let recipients: { _id: mongoose.Types.ObjectId }[] = [];

  switch (notification.targetAudience) {
    case "all":
      recipients = await User.find({}, "_id");
      break;
    case "specific_users":
      if (notification.specificUsers?.length) {
        recipients = await User.find(
          { _id: { $in: notification.specificUsers } },
          "_id"
        );
      }
      break;
    case "customers":
      recipients = await User.find({ role: "user" }, "_id");
      break;
    case "delivery_partners":
      recipients = await User.find({ role: "delivery_partner" }, "_id");
      break;
    case "admins":
      recipients = await SuperAdmin.find({ role: "superadmin" }, "_id");
      break;
  }

  // Save notification stats
  notification.stats = notification.stats ?? {
    totalSent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
  };
  notification.sentAt = new Date();
  notification.status = "sent";
  await notification.save();

  // Emit full notification with aggregation
  if (io) {
    const fullNotification = await Notification.aggregate([
      { $match: { _id: notification._id } },

      // Convert userId
      {
        $addFields: {
          userIdObj: {
            $cond: [
              { $regexMatch: { input: "$userId", regex: /^[0-9a-fA-F]{24}$/ } },
              { $toObjectId: "$userId" },
              null,
            ],
          },
        },
      },

      // Join user
      {
        $lookup: {
          from: "users",
          localField: "userIdObj",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      // Join carts
      {
        $lookup: {
          from: "carts",
          localField: "referenceId",
          foreignField: "_id",
          as: "cart",
        },
      },
      { $unwind: { path: "$cart", preserveNullAndEmptyArrays: true } },

      // Join subscriptions
      {
        $lookup: {
          from: "subscriptions",
          localField: "referenceId",
          foreignField: "_id",
          as: "subscription",
        },
      },
      { $unwind: { path: "$subscription", preserveNullAndEmptyArrays: true } },

      // Join orders
      {
        $lookup: {
          from: "orders",
          localField: "referenceId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },

      // Project fields
      {
        $project: {
          _id: 1,
          title: 1,
          message: 1,
          type: 1,
          priority: 1,
          channel: 1,
          createdAt: 1,
          user: {
            _id: "$user._id",
            username: "$user.username",
            email: "$user.email",
            role: "$user.role",
          },
          cart: { cartId: "$cart._id", totalPrice: "$cart.totalPrice" },
          subscription: {
            subscriptionId: "$subscription._id",
            planName: "$subscription.planName",
            status: "$subscription.status",
          },
          order: { orderId: "$order._id", status: "$order.status", totalAmount: "$order.totalAmount" },
        },
      },
    ]);

    if (fullNotification.length > 0) {
      for (const user of recipients) {
        io.to(user._id.toString()).emit("new-notification", fullNotification[0]);
      }

      // Optional: broadcast to admins
      io.to("superadmin").emit("new-notification", fullNotification[0]);
    }
  }
};


// ---------------- GET ALL NOTIFICATIONS ----------------
export const getAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "username email role");
    res.status(200).json({ success: true, notifications });
  } catch (err: any) {
    console.error("Get all notifications error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch notifications", error: err.message });
  }
};

// ---------------- GET USER NOTIFICATIONS ----------------
export const getUserNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({
      $or: [
        { targetAudience: "all" },
        { targetAudience: req.user.role },
        { specificUsers: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, notifications });
  } catch (err: any) {
    console.error("Get user notifications error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch notifications", error: err.message });
  }
};

// ---------------- UPDATE NOTIFICATION ----------------
export const updateNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { notificationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const io = req.app.get("io");
    if (io) io.emit("notificationUpdated", notification);

    res.status(200).json({ success: true, notification });
  } catch (err: any) {
    console.error("Update notification error:", err);
    res
      .status(500)
      .json({ message: "Failed to update notification", error: err.message });
  }
};

// ---------------- MARK NOTIFICATION AS READ ----------------
export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

   notification.stats = notification.stats ?? { totalSent: 0, delivered: 0, opened: 0, clicked: 0 };
   notification.stats.opened += 1;
    await notification.save();

    const io = req.app.get("io");
    if (io) {
      io.to(userId.toString()).emit("notificationRead", { notificationId });
      io.emit("statsUpdated", {
        notificationId,
        stats: notification.stats,
      });
    }

    res.status(200).json({ success: true, notification });
  } catch (err: any) {
    console.error("Mark read error:", err);
    res
      .status(500)
      .json({ message: "Failed to mark notification as read", error: err.message });
  }
};
export const getFullNotifications = async (_req: Request, res: Response) => {
  try {
    const notifications = await Notification.aggregate([
      // Safely convert userId to ObjectId only if valid
      {
        $addFields: {
          userIdObj: {
            $cond: [
              { $regexMatch: { input: "$userId", regex: /^[0-9a-fA-F]{24}$/ } },
              { $toObjectId: "$userId" },
              null,
            ],
          },
        },
      },

      // Join with users (system notifications will have null user)
      {
        $lookup: {
          from: "users",
          localField: "userIdObj",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      // Join with carts
      {
        $lookup: {
          from: "carts",
          localField: "referenceId",
          foreignField: "_id",
          as: "cart",
        },
      },
      { $unwind: { path: "$cart", preserveNullAndEmptyArrays: true } },

      // Join with subscriptions
      {
        $lookup: {
          from: "subscriptions",
          localField: "referenceId",
          foreignField: "_id",
          as: "subscription",
        },
      },
      { $unwind: { path: "$subscription", preserveNullAndEmptyArrays: true } },

      // Join with orders
      {
        $lookup: {
          from: "orders",
          localField: "referenceId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },

      // Project only needed fields
      {
        $project: {
          _id: 1,
          title: 1,
          message: 1,
          type: 1,
          priority: 1,
          channel: 1,
          createdAt: 1,
          user: {
            _id: "$user._id",
            username: "$user.username",
            email: "$user.email",
            role: "$user.role",
          },
          cart: { cartId: "$cart._id", totalPrice: "$cart.totalPrice" },
          subscription: {
            subscriptionId: "$subscription._id",
            planName: "$subscription.planName",
            status: "$subscription.status",
          },
          order: { orderId: "$order._id", status: "$order.status", totalAmount: "$order.totalAmount" },
        },
      },

      // Sort latest first
      { $sort: { createdAt: -1 } },
    ]);

    // Compute counts by type safely
    const counts = {
      subscription: notifications.filter((n) => n.type === "subscription").length,
      cart: notifications.filter((n) => n.type === "cart").length,
      order: notifications.filter((n) => n.type === "order").length,
    };

    res.status(200).json({ success: true, notifications, counts });
  } catch (err: any) {
    console.error("Error fetching full notifications:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching full notifications",
      error: err.message || err,
    });
  }
};

