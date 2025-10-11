"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFullNotifications = exports.markNotificationRead = exports.updateNotification = exports.getUserNotifications = exports.getAllNotifications = exports.sendNotification = exports.createNotification = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Notification_1 = __importDefault(require("../models/Notification"));
const User_1 = __importDefault(require("../models/User"));
const notificationQueue_1 = require("../queue/notificationQueue");
const SuperAdmin_1 = __importDefault(require("../models/SuperAdmin"));
// ---------------- CREATE NOTIFICATION ----------------
const createNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { title, message, type, priority, targetAudience, specificUsers, scheduledFor, channels, metadata, createdBy: createdByBody, } = req.body;
        if (!title || !message || !type || !targetAudience) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        // Determine createdBy
        let createdBy = createdByBody || ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
        if (!createdBy || !mongoose_1.default.Types.ObjectId.isValid(createdBy)) {
            return res.status(400).json({ message: "Invalid createdBy user ID" });
        }
        const notification = new Notification_1.default({
            title,
            message,
            type,
            priority: priority !== null && priority !== void 0 ? priority : "medium",
            targetAudience,
            specificUsers,
            scheduledFor,
            channels: {
                inApp: (_b = channels === null || channels === void 0 ? void 0 : channels.inApp) !== null && _b !== void 0 ? _b : true, // only in-app now
            },
            metadata,
            createdBy,
            status: scheduledFor && new Date(scheduledFor) > new Date()
                ? "scheduled"
                : "sent",
            stats: { totalSent: 0, delivered: 0, opened: 0, clicked: 0 },
        });
        yield notification.save();
        const io = req.app.get("io");
        // Scheduled notification
        if (scheduledFor && new Date(scheduledFor) > new Date()) {
            yield notificationQueue_1.notificationQueue.add({ notificationId: notification.id.toString() }, { delay: new Date(scheduledFor).getTime() - Date.now() });
            return res
                .status(201)
                .json({ message: "Notification scheduled", notification });
        }
        // Immediate sending
        yield (0, exports.sendNotification)(notification, io);
        res
            .status(201)
            .json({ message: "Notification sent successfully", notification });
    }
    catch (err) {
        console.error("Notification error:", err);
        res
            .status(500)
            .json({ message: "Failed to send notification", error: err.message });
    }
});
exports.createNotification = createNotification;
// ---------------- SEND NOTIFICATION FUNCTION ----------------
const sendNotification = (notification, io) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Determine recipients
    let recipients = [];
    switch (notification.targetAudience) {
        case "all":
            recipients = yield User_1.default.find({}, "_id");
            break;
        case "specific_users":
            if ((_a = notification.specificUsers) === null || _a === void 0 ? void 0 : _a.length) {
                recipients = yield User_1.default.find({ _id: { $in: notification.specificUsers } }, "_id");
            }
            break;
        case "customers":
            recipients = yield User_1.default.find({ role: "user" }, "_id");
            break;
        case "delivery_partners":
            recipients = yield User_1.default.find({ role: "delivery_partner" }, "_id");
            break;
        case "admins":
            recipients = yield SuperAdmin_1.default.find({ role: "superadmin" }, "_id");
            break;
    }
    // Save notification stats
    notification.stats = (_b = notification.stats) !== null && _b !== void 0 ? _b : {
        totalSent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
    };
    notification.sentAt = new Date();
    notification.status = "sent";
    yield notification.save();
    // Emit full notification with aggregation
    if (io) {
        const fullNotification = yield Notification_1.default.aggregate([
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
});
exports.sendNotification = sendNotification;
// ---------------- GET ALL NOTIFICATIONS ----------------
const getAllNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notifications = yield Notification_1.default.find()
            .sort({ createdAt: -1 })
            .populate("createdBy", "username email role");
        res.status(200).json({ success: true, notifications });
    }
    catch (err) {
        console.error("Get all notifications error:", err);
        res
            .status(500)
            .json({ message: "Failed to fetch notifications", error: err.message });
    }
});
exports.getAllNotifications = getAllNotifications;
// ---------------- GET USER NOTIFICATIONS ----------------
const getUserNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        const notifications = yield Notification_1.default.find({
            $or: [
                { targetAudience: "all" },
                { targetAudience: req.user.role },
                { specificUsers: userId },
            ],
        })
            .sort({ createdAt: -1 })
            .limit(50);
        res.status(200).json({ success: true, notifications });
    }
    catch (err) {
        console.error("Get user notifications error:", err);
        res
            .status(500)
            .json({ message: "Failed to fetch notifications", error: err.message });
    }
});
exports.getUserNotifications = getUserNotifications;
// ---------------- UPDATE NOTIFICATION ----------------
const updateNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { notificationId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(notificationId)) {
            return res.status(400).json({ message: "Invalid notification ID" });
        }
        const notification = yield Notification_1.default.findByIdAndUpdate(notificationId, req.body, { new: true, runValidators: true });
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        const io = req.app.get("io");
        if (io)
            io.emit("notificationUpdated", notification);
        res.status(200).json({ success: true, notification });
    }
    catch (err) {
        console.error("Update notification error:", err);
        res
            .status(500)
            .json({ message: "Failed to update notification", error: err.message });
    }
});
exports.updateNotification = updateNotification;
// ---------------- MARK NOTIFICATION AS READ ----------------
const markNotificationRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { notificationId } = req.params;
        const userId = req.user._id;
        if (!mongoose_1.default.Types.ObjectId.isValid(notificationId)) {
            return res.status(400).json({ message: "Invalid notification ID" });
        }
        const notification = yield Notification_1.default.findById(notificationId);
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        notification.stats = (_a = notification.stats) !== null && _a !== void 0 ? _a : { totalSent: 0, delivered: 0, opened: 0, clicked: 0 };
        notification.stats.opened += 1;
        yield notification.save();
        const io = req.app.get("io");
        if (io) {
            io.to(userId.toString()).emit("notificationRead", { notificationId });
            io.emit("statsUpdated", {
                notificationId,
                stats: notification.stats,
            });
        }
        res.status(200).json({ success: true, notification });
    }
    catch (err) {
        console.error("Mark read error:", err);
        res
            .status(500)
            .json({ message: "Failed to mark notification as read", error: err.message });
    }
});
exports.markNotificationRead = markNotificationRead;
const getFullNotifications = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notifications = yield Notification_1.default.aggregate([
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
    }
    catch (err) {
        console.error("Error fetching full notifications:", err);
        res.status(500).json({
            success: false,
            message: "Error fetching full notifications",
            error: err.message || err,
        });
    }
});
exports.getFullNotifications = getFullNotifications;
