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
exports.autoAssignDelivery = exports.getOrdersByDriver = exports.updateOrderStatus = exports.assignOrderToPartner = exports.getPartnerOrders = exports.generateDriverQRCode = exports.getOverallStats = exports.getDriverStats = exports.getAllDeliveries = exports.trackDelivery = exports.deliverOrder = exports.updateDeliveryStatus = exports.assignDelivery = exports.updatePartnerStatus = exports.toggleStatus = exports.deletePartner = exports.updatePartner = exports.getPartnerById = exports.getAllPartners = exports.createDelveryPartner = exports.createPartner = exports.loginPartner = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = require("mongoose");
const DeliveryPartner_1 = __importDefault(require("../models/DeliveryPartner"));
const Delivery_1 = __importDefault(require("../models/Delivery"));
const DailyOrder_1 = require("../models/DailyOrder");
const notification_1 = require("../util/notification");
const JWT_SECRET = process.env.JWT_SECRET || "secret_key";
const qrcode_1 = __importDefault(require("qrcode"));
/* ===========================
   DELIVERY PARTNER AUTHENTICATION
   =========================== */
const loginPartner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const partner = yield DeliveryPartner_1.default.findOne({ email });
        if (!partner)
            return res.status(404).json({ message: "Partner not found" });
        const valid = yield bcryptjs_1.default.compare(password, partner.password);
        if (!valid)
            return res.status(400).json({ message: "Invalid credentials" });
        const token = jsonwebtoken_1.default.sign({ id: partner._id, role: "driver" }, JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, partner });
    }
    catch (err) {
        console.error("loginPartner:", err);
        res.status(500).json({ message: "Login failed" });
    }
});
exports.loginPartner = loginPartner;
/* ===========================
   DELIVERY PARTNER CRUD OPERATIONS
   =========================== */
const createPartner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, phone, password, vehicleType, vehicleNumber, licenseNumber, adminId } = req.body;
        const exists = yield DeliveryPartner_1.default.findOne({ email });
        if (exists)
            return res.status(400).json({ message: "Email already exists" });
        const hashed = password ? yield bcryptjs_1.default.hash(password, 10) : undefined;
        const partner = yield DeliveryPartner_1.default.create({
            name,
            email,
            phone,
            password: hashed,
            vehicleType,
            vehicleNumber,
            licenseNumber,
            adminId: adminId ? new mongoose_1.Types.ObjectId(adminId) : undefined
        });
        // Notify admin
        if (adminId) {
            yield (0, notification_1.sendNotification)({
                recipientType: "admin",
                recipientId: adminId,
                type: "delivery",
                title: "Delivery Partner Created",
                message: `Partner ${name} was created.`,
            });
        }
        res.status(201).json({ message: "Partner created", partner });
    }
    catch (err) {
        console.error("createPartner:", err);
        res.status(500).json({ message: "Error creating partner" });
    }
});
exports.createPartner = createPartner;
const createDelveryPartner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, phone, vehicleType, vehicleNumber, licenseNumber, adminId } = req.body;
        const exists = yield DeliveryPartner_1.default.findOne({ email });
        if (exists)
            res.status(400).json({ message: "Email already exists" });
        const partner = yield DeliveryPartner_1.default.create({
            name,
            email,
            phone,
            vehicleType,
            vehicleNumber,
            licenseNumber,
            adminId: adminId ? new mongoose_1.Types.ObjectId(adminId) : undefined,
        });
        // Notify admin
        if (adminId) {
            yield (0, notification_1.sendNotification)({
                recipientType: "admin",
                type: "delivery",
                recipientId: adminId,
                title: "Delivery Partner Created",
                message: `Partner ${name} was created.`,
            });
        }
        res.status(201).json({ message: "Partner created", partner });
    }
    catch (err) {
        console.error("createPartner:", err);
        res.status(500).json({ message: "Error creating partner" });
    }
});
exports.createDelveryPartner = createDelveryPartner;
const getAllPartners = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partners = yield DeliveryPartner_1.default.find();
        res.json(partners);
    }
    catch (err) {
        console.error("getAllPartners:", err);
        res.status(500).json({ message: "Failed to fetch partners" });
    }
});
exports.getAllPartners = getAllPartners;
const getPartnerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partner = yield DeliveryPartner_1.default.findById(req.params.id);
        if (!partner)
            return res.status(404).json({ message: "Partner not found" });
        res.json(partner);
    }
    catch (err) {
        console.error("getPartnerById:", err);
        res.status(500).json({ message: "Error fetching partner" });
    }
});
exports.getPartnerById = getPartnerById;
const updatePartner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updateBody = Object.assign({}, req.body);
        if (updateBody.password) {
            updateBody.password = yield bcryptjs_1.default.hash(updateBody.password, 10);
        }
        const partner = yield DeliveryPartner_1.default.findByIdAndUpdate(req.params.id, updateBody, { new: true });
        // Notify admin about update
        if (partner === null || partner === void 0 ? void 0 : partner.adminId) {
            yield (0, notification_1.sendNotification)({
                recipientType: "admin",
                recipientId: partner.adminId.toString(),
                type: "delivery",
                title: "Delivery Partner Updated",
                message: `Partner ${partner.name} details were updated.`,
            });
        }
        res.json(partner);
    }
    catch (err) {
        console.error("updatePartner:", err);
        res.status(500).json({ message: "Error updating partner" });
    }
});
exports.updatePartner = updatePartner;
const deletePartner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partner = yield DeliveryPartner_1.default.findByIdAndDelete(req.params.id);
        if (partner && partner.adminId) {
            yield (0, notification_1.sendNotification)({
                recipientType: "admin",
                recipientId: partner.adminId.toString(),
                type: "delivery",
                title: "Delivery Partner Deleted",
                message: `Partner ${partner.name} was deleted.`,
            });
        }
        res.json({ message: "Partner deleted" });
    }
    catch (err) {
        console.error("deletePartner:", err);
        res.status(500).json({ message: "Failed to delete partner" });
    }
});
exports.deletePartner = deletePartner;
/* ===========================
   DRIVER STATUS & LOCATION MANAGEMENT
   =========================== */
const toggleStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.body;
        if (!["available", "busy", "offline"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const partner = yield DeliveryPartner_1.default.findByIdAndUpdate(req.params.id, { currentStatus: status }, { new: true });
        // Notify admin
        if (partner === null || partner === void 0 ? void 0 : partner.adminId) {
            yield (0, notification_1.sendNotification)({
                recipientType: "admin",
                recipientId: partner.adminId.toString(),
                type: "delivery",
                title: `Driver ${partner.name} is now ${status}`,
                message: `Driver ${partner.name} status changed to ${status}`,
            });
        }
        res.json(partner);
    }
    catch (err) {
        console.error("toggleStatus:", err);
        res.status(500).json({ message: "Failed to update status" });
    }
});
exports.toggleStatus = toggleStatus;
const updatePartnerStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currentStatus, latitude, longitude } = req.body;
        const update = {};
        if (currentStatus)
            update.currentStatus = currentStatus;
        if (typeof latitude === "number" && typeof longitude === "number") {
            update.location = { latitude, longitude, lastUpdated: new Date() };
        }
        const partner = yield DeliveryPartner_1.default.findByIdAndUpdate(req.params.id, update, { new: true });
        // Notify admin when driver status changes
        if (partner && currentStatus && partner.adminId) {
            yield (0, notification_1.sendNotification)({
                recipientType: "admin",
                type: "delivery",
                recipientId: partner.adminId.toString(),
                title: `Driver ${partner.name} is now ${currentStatus}`,
                message: `${partner.name} changed status to ${currentStatus}`,
            });
        }
        res.json(partner);
    }
    catch (err) {
        console.error("updatePartnerStatus:", err);
        res.status(500).json({ message: "Failed to update partner status" });
    }
});
exports.updatePartnerStatus = updatePartnerStatus;
/* ===========================
   DELIVERY ASSIGNMENT & MANAGEMENT
   =========================== */
const assignDelivery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, orderId, driverId } = req.body;
        if (!userId || !orderId || !driverId) {
            return res.status(400).json({ message: "userId, orderId, and driverId are required" });
        }
        // 1️⃣ Find the order by orderId (not just userId)
        const order = yield DailyOrder_1.DailyOrder.findById(orderId).populate("meals.productId");
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        // Prepare deliveredProducts array from meals
        const deliveredProducts = order.meals.map((meal) => {
            var _a, _b;
            return ({
                productId: (_a = meal.productId) === null || _a === void 0 ? void 0 : _a._id,
                name: (_b = meal.productId) === null || _b === void 0 ? void 0 : _b.name,
                quantity: meal.quantity,
                price: meal.costPrice, // use costPrice here
                costPrice: meal.costPrice,
                status: "pending",
            });
        });
        // 2️⃣ Create Delivery entry
        const delivery = yield Delivery_1.default.create({
            orderId: order._id,
            customerId: userId,
            driverId: new mongoose_1.Types.ObjectId(driverId),
            deliveryPartnerId: new mongoose_1.Types.ObjectId(driverId),
            items: order.meals,
            totalAmount: order.meals.reduce((sum, m) => sum + (m.costPrice || 0) * m.quantity, 0),
            deliveryStatus: "assigned",
            assignedAt: new Date(),
            deliveredProducts, // <-- costPrice is used for price field
        });
        // 3️⃣ Update driver status
        yield DeliveryPartner_1.default.findByIdAndUpdate(driverId, { currentStatus: "busy" });
        // 4️⃣ Update order status
        yield DailyOrder_1.DailyOrder.findByIdAndUpdate(orderId, { orderStatus: "out_for_delivery" });
        // 5️⃣ Notifications
        yield (0, notification_1.sendNotification)({
            recipientType: "driver",
            recipientId: driverId,
            type: "delivery",
            title: "New Delivery Assigned",
            message: `You have been assigned to order ${orderId}`,
            relatedDelivery: delivery.id.toString(),
        });
        yield (0, notification_1.sendNotification)({
            recipientType: "user",
            recipientId: userId,
            type: "driver assigned",
            title: "Driver Assigned",
            message: "Your order is out for delivery!",
            relatedDelivery: delivery.id.toString(),
        });
        res.json({ message: "Delivery assigned successfully", delivery });
    }
    catch (err) {
        console.error("assignDelivery:", err);
        res.status(500).json({ message: "Failed to assign delivery", error: err });
    }
});
exports.assignDelivery = assignDelivery;
const updateDeliveryStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deliveryId, status } = req.body;
        if (!deliveryId || !status) {
            return res.status(400).json({ message: "deliveryId and status required" });
        }
        const update = { deliveryStatus: status };
        if (status === "picked_up")
            update.pickedUpAt = new Date();
        if (status === "delivered")
            update.deliveredAt = new Date();
        const delivery = yield Delivery_1.default.findByIdAndUpdate(deliveryId, update, { new: true });
        if (!delivery)
            return res.status(404).json({ message: "Delivery not found" });
        // Update driver stats and status
        if (delivery.driverId) {
            if (status === "delivered") {
                yield DeliveryPartner_1.default.findByIdAndUpdate(delivery.driverId, {
                    $inc: { totalDeliveries: 1, completedDeliveries: 1 },
                    currentStatus: "available",
                });
            }
            else if (status === "picked_up") {
                yield DeliveryPartner_1.default.findByIdAndUpdate(delivery.driverId, { currentStatus: "busy" });
            }
        }
        // Notify driver
        if (delivery.driverId) {
            yield (0, notification_1.sendNotification)({
                recipientType: "driver",
                recipientId: delivery.driverId.toString(),
                type: "delivery",
                title: `Delivery Status Updated: ${status}`,
                message: `Delivery ${delivery._id} is now ${status}`,
            });
        }
        // Notify user
        if (delivery.customerId) {
            yield (0, notification_1.sendNotification)({
                recipientType: "user",
                recipientId: delivery.customerId.toString(),
                type: "order",
                title: `Your order is ${status}`,
                message: `Delivery ${delivery._id} status updated to ${status}`,
            });
        }
        // Notify admin
        if (delivery.restaurantId) {
            yield (0, notification_1.sendNotification)({
                recipientType: "admin",
                recipientId: delivery.restaurantId.toString(),
                type: "delivery",
                title: "Delivery Status Updated",
                message: `Delivery ${deliveryId} status: ${status}`,
                relatedDelivery: deliveryId,
            });
        }
        res.json(delivery);
    }
    catch (err) {
        console.error("updateDeliveryStatus:", err);
        res.status(500).json({ message: "Failed to update delivery status" });
    }
});
exports.updateDeliveryStatus = updateDeliveryStatus;
const deliverOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deliveryId } = req.params;
        const delivery = yield Delivery_1.default.findById(deliveryId);
        if (!delivery)
            return res.status(404).json({ message: "Delivery not found" });
        // Get order product details
        const dailyOrder = yield DailyOrder_1.DailyOrder.findById(delivery.orderId);
        if (!dailyOrder)
            return res.status(404).json({ message: "Daily order not found" });
        delivery.deliveryStatus = "delivered";
        delivery.deliveredAt = new Date();
        // Save delivered products
        delivery.deliveredProducts = dailyOrder.meals.map(m => ({
            productId: m.productId,
            name: m.productId.toString(), // replace with populated name if needed
            quantity: m.quantity || 1,
            price: m.price || 0
        }));
        yield delivery.save();
        // Update driver stats
        if (delivery.driverId) {
            yield DeliveryPartner_1.default.findByIdAndUpdate(delivery.driverId, {
                $inc: { totalDeliveries: 1, completedDeliveries: 1 },
                currentStatus: "available"
            });
        }
        // Notify customer
        if (delivery.customerId) {
            yield (0, notification_1.sendNotification)({
                recipientType: "user",
                recipientId: delivery.customerId.toString(),
                type: "order",
                title: "Order Delivered",
                message: `Your order ${delivery.orderId} has been delivered.`,
                relatedDelivery: deliveryId,
            });
        }
        res.json({ message: "Order delivered successfully", delivery });
    }
    catch (err) {
        console.error("deliverOrder:", err);
        res.status(500).json({ message: "Failed to deliver order" });
    }
});
exports.deliverOrder = deliverOrder;
/* ===========================
   DELIVERY TRACKING
   =========================== */
const trackDelivery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const delivery = yield Delivery_1.default.findById(req.params.id)
            .populate("driverId", "name phone vehicleType vehicleNumber location"); // populate location
        if (!delivery)
            return res.status(404).json({ message: "Delivery not found" });
        // Type assertion: tell TS this is now a populated driver object
        const driver = delivery.driverId;
        res.json({
            deliveryId: delivery._id,
            status: delivery.deliveryStatus,
            driver: driver
                ? {
                    name: driver.name,
                    phone: driver.phone,
                    vehicleType: driver.vehicleType,
                    vehicleNumber: driver.vehicleNumber,
                    location: driver.location, // ✅ now works
                }
                : null,
            assignedAt: delivery.assignedAt,
            pickedUpAt: delivery.pickedUpAt,
            deliveredAt: delivery.deliveredAt,
            products: delivery.deliveredProducts,
        });
    }
    catch (err) {
        console.error("trackDelivery:", err);
        res.status(500).json({ message: "Failed to track delivery" });
    }
});
exports.trackDelivery = trackDelivery;
const getAllDeliveries = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deliveries = yield Delivery_1.default.find()
            .populate("driverId", "name phone") // driver details
            .populate("customerId", "name email phone") // customer details
            .populate({
            path: "orderId",
            model: DailyOrder_1.DailyOrder, // populate the order
            select: "subscriptionId meals", // select fields you need
            populate: {
                path: "subscriptionId", // nested populate subscription
                select: "planName planType price duration", // subscription details
            },
        });
        res.json(deliveries);
    }
    catch (err) {
        console.error("getAllDeliveries:", err);
        res.status(500).json({ message: "Failed to fetch deliveries" });
    }
});
exports.getAllDeliveries = getAllDeliveries;
/* ===========================
   STATISTICS & ANALYTICS
   =========================== */
const getDriverStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const driverId = req.params.id;
        const partner = yield DeliveryPartner_1.default.findById(driverId);
        if (!partner)
            return res.status(404).json({ message: "Driver not found" });
        res.json({
            id: partner._id,
            name: partner.name,
            totalDeliveries: partner.totalDeliveries,
            completedDeliveries: partner.completedDeliveries,
            rating: partner.rating,
            earnings: partner.earnings,
            status: partner.currentStatus,
            lastLocation: partner.location,
        });
    }
    catch (err) {
        console.error("getDriverStats:", err);
        res.status(500).json({ message: "Failed to fetch driver stats" });
    }
});
exports.getDriverStats = getDriverStats;
const getOverallStats = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Drivers
        const totalDrivers = yield DeliveryPartner_1.default.countDocuments();
        const activeDrivers = yield DeliveryPartner_1.default.countDocuments({ currentStatus: "available" });
        const busyDrivers = yield DeliveryPartner_1.default.countDocuments({ currentStatus: "busy" });
        // Deliveries
        const totalDeliveries = yield Delivery_1.default.countDocuments();
        const completedDeliveries = yield Delivery_1.default.countDocuments({ deliveryStatus: "delivered" });
        const pendingDeliveries = yield Delivery_1.default.countDocuments({ deliveryStatus: "pending" });
        const assignedDeliveries = yield Delivery_1.default.countDocuments({ deliveryStatus: "assigned" });
        const dispatchedDeliveries = yield Delivery_1.default.countDocuments({ deliveryStatus: "dispatched" });
        const pickedUpDeliveries = yield Delivery_1.default.countDocuments({ deliveryStatus: "picked_up" });
        const cancelledDeliveries = yield Delivery_1.default.countDocuments({ deliveryStatus: "cancelled" });
        const failedDeliveries = yield Delivery_1.default.countDocuments({ deliveryStatus: "failed" });
        // Optional: average delivery duration (for completed deliveries)
        const completed = yield Delivery_1.default.find({ deliveryStatus: "delivered" })
            .select("assignedAt deliveredAt")
            .lean();
        let avgDeliveryTimeMinutes = 0;
        if (completed.length > 0) {
            const totalMinutes = completed.reduce((sum, d) => {
                if (d.assignedAt && d.deliveredAt) {
                    const diff = (new Date(d.deliveredAt).getTime() - new Date(d.assignedAt).getTime()) / 60000;
                    return sum + diff;
                }
                return sum;
            }, 0);
            avgDeliveryTimeMinutes = parseFloat((totalMinutes / completed.length).toFixed(2));
        }
        res.json({
            drivers: {
                total: totalDrivers,
                active: activeDrivers,
                busy: busyDrivers,
            },
            deliveries: {
                total: totalDeliveries,
                completed: completedDeliveries,
                pending: pendingDeliveries,
                assigned: assignedDeliveries,
                dispatched: dispatchedDeliveries,
                pickedUp: pickedUpDeliveries,
                cancelled: cancelledDeliveries,
                failed: failedDeliveries,
                avgDeliveryTimeMinutes,
            },
        });
    }
    catch (err) {
        console.error("getOverallStats:", err);
        res.status(500).json({ message: "Failed to fetch overall stats" });
    }
});
exports.getOverallStats = getOverallStats;
// Generate QR code for a driver
const generateDriverQRCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const driverId = req.params.id;
        const driver = yield DeliveryPartner_1.default.findById(driverId);
        if (!driver)
            return res.status(404).json({ message: "Driver not found" });
        const qrData = JSON.stringify({ driverId: driver.id.toString(), name: driver.name });
        const qrCodeURL = yield qrcode_1.default.toDataURL(qrData); // returns base64 image URL
        res.json({ driverId: driver._id, qrCodeURL });
    }
    catch (err) {
        console.error("generateDriverQRCode:", err);
        res.status(500).json({ message: "Failed to generate QR code" });
    }
});
exports.generateDriverQRCode = generateDriverQRCode;
/* ===========================
   GET ORDERS ASSIGNED TO A DELIVERY PARTNER
   =========================== */
const getPartnerOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const driverId = req.params.id;
        // Find deliveries assigned to this driver
        const deliveries = yield Delivery_1.default.find({ driverId: driverId })
            .populate({
            path: "orderId",
            model: "DailyOrder",
        })
            .populate("customerId", "-password")
            .populate("deliveredProducts.productId")
            .lean();
        const formattedOrders = deliveries.map(d => {
            const dailyOrder = d.orderId; // populated DailyOrder
            const user = dailyOrder === null || dailyOrder === void 0 ? void 0 : dailyOrder.userId;
            return {
                deliveryId: d._id,
                status: d.deliveryStatus,
                assignedAt: d.assignedAt,
                pickedUpAt: d.pickedUpAt,
                deliveredAt: d.deliveredAt,
                customer: user ? { id: user._id, name: user.name, phone: user.phone } : null,
                meals: dailyOrder === null || dailyOrder === void 0 ? void 0 : dailyOrder.meals.map((m) => ({
                    productId: m.productId._id,
                    name: m.productId.name,
                    price: m.productId.price,
                    quantity: m.quantity,
                })),
                totalPrice: dailyOrder === null || dailyOrder === void 0 ? void 0 : dailyOrder.totalPrice,
            };
        });
        res.json({ orders: formattedOrders });
    }
    catch (err) {
        console.error("getPartnerOrders:", err);
        res.status(500).json({ message: "Failed to fetch partner orders" });
    }
});
exports.getPartnerOrders = getPartnerOrders;
/* ===========================
   ASSIGN ORDER TO DELIVERY PARTNER
   =========================== */
const assignOrderToPartner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deliveryId, driverId } = req.body;
        if (!deliveryId || !driverId)
            return res.status(400).json({ message: "deliveryId and driverId required" });
        // Assign delivery
        const delivery = yield Delivery_1.default.findByIdAndUpdate(deliveryId, {
            driverId: new mongoose_1.Types.ObjectId(driverId),
            deliveryStatus: "assigned",
            assignedAt: new Date(),
        }, { new: true }).populate({
            path: "orderId",
            populate: { path: "meals.productId userId" },
        });
        if (!delivery)
            return res.status(404).json({ message: "Delivery not found" });
        // Update driver status to busy
        yield DeliveryPartner_1.default.findByIdAndUpdate(driverId, { currentStatus: "busy" });
        // Send notifications
        const dailyOrder = delivery.orderId;
        const customer = dailyOrder === null || dailyOrder === void 0 ? void 0 : dailyOrder.userId;
        yield (0, notification_1.sendNotification)({
            recipientType: "driver",
            recipientId: driverId,
            type: "delivery",
            title: "New Delivery Assigned",
            message: `You have been assigned delivery ${deliveryId}`,
            relatedDelivery: deliveryId,
        });
        if (customer) {
            yield (0, notification_1.sendNotification)({
                recipientType: "user",
                recipientId: customer._id.toString(),
                type: "order",
                title: "Driver Assigned",
                message: `A driver has been assigned to your order.`,
                relatedDelivery: deliveryId,
            });
        }
        res.json({ message: "Order assigned to driver successfully", delivery });
    }
    catch (err) {
        console.error("assignOrderToPartner:", err);
        res.status(500).json({ message: "Failed to assign order" });
    }
});
exports.assignOrderToPartner = assignOrderToPartner;
/* ===========================
   UPDATE DELIVERY STATUS
   =========================== */
const updateOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deliveryId } = req.params; // from URL
        const { status } = req.body; // from body
        if (!status)
            return res.status(400).json({ message: "status required" });
        const delivery = yield Delivery_1.default.findById(deliveryId);
        if (!delivery)
            return res.status(404).json({ message: "Delivery not found" });
        const update = { deliveryStatus: status };
        if (status === "picked_up")
            update.pickedUpAt = new Date();
        if (status === "delivered")
            update.deliveredAt = new Date();
        yield Delivery_1.default.findByIdAndUpdate(deliveryId, update, { new: true });
        // Update driver stats
        if (delivery.driverId) {
            if (status === "picked_up") {
                yield DeliveryPartner_1.default.findByIdAndUpdate(delivery.driverId, { currentStatus: "busy" });
            }
            else if (status === "delivered") {
                yield DeliveryPartner_1.default.findByIdAndUpdate(delivery.driverId, {
                    $inc: { totalDeliveries: 1, completedDeliveries: 1 },
                    currentStatus: "available",
                });
            }
        }
        // Notifications
        if (delivery.driverId) {
            yield (0, notification_1.sendNotification)({
                recipientType: "driver",
                recipientId: delivery.driverId.toString(),
                type: "delivery",
                title: `Delivery Status Updated: ${status}`,
                message: `Delivery ${delivery._id} is now ${status}`,
            });
        }
        if (delivery.customerId) {
            yield (0, notification_1.sendNotification)({
                recipientType: "user",
                recipientId: delivery.customerId.toString(),
                type: "order",
                title: `Your order is ${status}`,
                message: `Delivery ${delivery._id} status updated to ${status}`,
            });
        }
        res.json({ message: "Delivery status updated", deliveryId, status });
    }
    catch (err) {
        console.error("updateOrderStatus:", err);
        res.status(500).json({ message: "Failed to update delivery status" });
    }
});
exports.updateOrderStatus = updateOrderStatus;
const getOrdersByDriver = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { driverId } = req.params;
        if (!driverId || !mongoose_1.Types.ObjectId.isValid(driverId)) {
            return res.status(400).json({ message: "Invalid driver ID" });
        }
        const deliveries = yield Delivery_1.default.find({ driverId })
            .populate({
            path: "customerId",
            select: "_id name email phone",
        })
            .populate({
            path: "orderId", // or "dailyOrderId" depending on your schema
            model: DailyOrder_1.DailyOrder,
            select: "_id subscriptionId meals date orderStatus paymentStatus totalPrice",
            populate: [
                {
                    path: "subscriptionId", // populate subscription details
                    select: "_id planName planType meals",
                },
                {
                    path: "meals.productId", // populate products in the daily order
                    select: "_id name description price",
                },
            ],
        })
            .populate({
            path: "deliveredProducts.productId",
            select: "_id name description price",
        })
            .sort({ createdAt: -1 })
            .lean();
        return res.json(deliveries);
    }
    catch (err) {
        console.error("Error fetching driver orders:", err);
        return res.status(500).json({ message: err.message || "Internal Server Error" });
    }
});
exports.getOrdersByDriver = getOrdersByDriver;
/* ===========================
   AUTO-ASSIGN DELIVERY TO AVAILABLE DRIVER
   =========================== */
/* ===========================
   AUTO-ASSIGN DELIVERY TO AVAILABLE DRIVER (TS SAFE)
   =========================== */
const autoAssignDelivery = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deliveryId } = req.body;
        if (!deliveryId)
            return res.status(400).json({ message: "deliveryId required" });
        // Find the delivery
        const delivery = yield Delivery_1.default.findById(deliveryId).populate("orderId");
        if (!delivery)
            return res.status(404).json({ message: "Delivery not found" });
        // Find an available driver
        const driver = yield DeliveryPartner_1.default.findOne({ currentStatus: "available" });
        if (!driver)
            return res.status(400).json({ message: "No available drivers at the moment" });
        // Assign delivery to driver using .set() (TypeScript safe)
        delivery.set("driverId", driver._id);
        delivery.set("deliveryStatus", "assigned");
        delivery.set("assignedAt", new Date());
        yield delivery.save();
        // Update driver status to busy
        driver.set("currentStatus", "busy");
        yield driver.save();
        // Notifications
        const dailyOrder = delivery.orderId;
        const customer = dailyOrder === null || dailyOrder === void 0 ? void 0 : dailyOrder.userId;
        yield (0, notification_1.sendNotification)({
            recipientType: "driver",
            recipientId: driver.id.toString(),
            type: "delivery",
            title: "New Delivery Assigned",
            message: `You have been assigned delivery ${deliveryId}`,
            relatedDelivery: deliveryId,
        });
        if (customer) {
            yield (0, notification_1.sendNotification)({
                recipientType: "user",
                recipientId: customer._id.toString(),
                type: "order",
                title: "Driver Assigned",
                message: `A driver has been assigned to your order.`,
                relatedDelivery: deliveryId,
            });
        }
        res.json({
            message: "Delivery automatically assigned to driver",
            delivery,
            driver: { id: driver._id, name: driver.name, phone: driver.phone },
        });
    }
    catch (err) {
        console.error("autoAssignDelivery:", err);
        res.status(500).json({ message: "Failed to auto-assign delivery" });
    }
});
exports.autoAssignDelivery = autoAssignDelivery;
