import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import DeliveryPartner from "../models/DeliveryPartner";
import Delivery from "../models/Delivery";
import { DailyOrder } from "../models/DailyOrder";
import { sendNotification } from "../util/notification";
import { IDelivery } from "../models/Delivery"; // your interfaces
import { IDeliveryPartner } from "../models/DailyPartner";
const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

import QRCode from "qrcode";


/* ===========================
   DELIVERY PARTNER AUTHENTICATION
   =========================== */

export const loginPartner = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const partner = await DeliveryPartner.findOne({ email });
    if (!partner) return res.status(404).json({ message: "Partner not found" });

    const valid = await bcrypt.compare(password, partner.password);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: partner._id, role: "driver" }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, partner });
  } catch (err) {
    console.error("loginPartner:", err);
    res.status(500).json({ message: "Login failed" });
  }
};

/* ===========================
   DELIVERY PARTNER CRUD OPERATIONS
   =========================== */

export const createPartner = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, vehicleType, vehicleNumber, licenseNumber, adminId } = req.body;

    const exists = await DeliveryPartner.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashed = password ? await bcrypt.hash(password, 10) : undefined;
    const partner = await DeliveryPartner.create({
      name,
      email,
      phone,
      password: hashed,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      adminId: adminId ? new Types.ObjectId(adminId) : undefined
    });

    // Notify admin
    if (adminId) {
      await sendNotification({
        recipientType: "admin",
        recipientId: adminId,
        type: "delivery",
        title: "Delivery Partner Created",
        message: `Partner ${name} was created.`,
      });
    }

    res.status(201).json({ message: "Partner created", partner });
  } catch (err) {
    console.error("createPartner:", err);
    res.status(500).json({ message: "Error creating partner" });
  }
};

export const createDelveryPartner = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, vehicleType, vehicleNumber, licenseNumber, adminId } = req.body;

    const exists = await DeliveryPartner.findOne({ email });
    if (exists)  res.status(400).json({ message: "Email already exists" });

    const partner = await DeliveryPartner.create({
      name,
      email,
      phone,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      adminId: adminId ? new Types.ObjectId(adminId) : undefined,
    });

    // Notify admin
    if (adminId) {
      await sendNotification({
        recipientType: "admin",
        type: "delivery",
        recipientId: adminId,
        title: "Delivery Partner Created",
        message: `Partner ${name} was created.`,
      });
    }

    res.status(201).json({ message: "Partner created", partner });
  } catch (err) {
    console.error("createPartner:", err);
    res.status(500).json({ message: "Error creating partner" });
  }
};

export const getAllPartners = async (_req: Request, res: Response) => {
  try {
    const partners = await DeliveryPartner.find();
    res.json(partners);
  } catch (err) {
    console.error("getAllPartners:", err);
    res.status(500).json({ message: "Failed to fetch partners" });
  }
};

export const getPartnerById = async (req: Request, res: Response) => {
  try {
    const partner = await DeliveryPartner.findById(req.params.id);
    if (!partner) return res.status(404).json({ message: "Partner not found" });
    res.json(partner);
  } catch (err) {
    console.error("getPartnerById:", err);
    res.status(500).json({ message: "Error fetching partner" });
  }
};

export const updatePartner = async (req: Request, res: Response) => {
  try {
    const updateBody = { ...req.body };
    if (updateBody.password) {
      updateBody.password = await bcrypt.hash(updateBody.password, 10);
    }

    const partner = await DeliveryPartner.findByIdAndUpdate(req.params.id, updateBody, { new: true });

    // Notify admin about update
    if (partner?.adminId) {
      await sendNotification({
        recipientType: "admin",
        recipientId: partner.adminId.toString(),
        type: "delivery",
        title: "Delivery Partner Updated",
        message: `Partner ${partner.name} details were updated.`,
      });
    }

    res.json(partner);
  } catch (err) {
    console.error("updatePartner:", err);
    res.status(500).json({ message: "Error updating partner" });
  }
};

export const deletePartner = async (req: Request, res: Response) => {
  try {
    const partner = await DeliveryPartner.findByIdAndDelete(req.params.id);
    if (partner && partner.adminId) {
      await sendNotification({
        recipientType: "admin",
        recipientId: partner.adminId.toString(),
        type: "delivery",
        title: "Delivery Partner Deleted",
        message: `Partner ${partner.name} was deleted.`,
      });
    }
    res.json({ message: "Partner deleted" });
  } catch (err) {
    console.error("deletePartner:", err);
    res.status(500).json({ message: "Failed to delete partner" });
  }
};

/* ===========================
   DRIVER STATUS & LOCATION MANAGEMENT
   =========================== */

export const toggleStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!["available", "busy", "offline"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const partner = await DeliveryPartner.findByIdAndUpdate(
      req.params.id, 
      { currentStatus: status }, 
      { new: true }
    );

    // Notify admin
    if (partner?.adminId) {
      await sendNotification({
        recipientType: "admin",
        recipientId: partner.adminId.toString(),
        type: "delivery",
        title: `Driver ${partner.name} is now ${status}`,
        message: `Driver ${partner.name} status changed to ${status}`,
      });
    }

    res.json(partner);
  } catch (err) {
    console.error("toggleStatus:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
};

export const updatePartnerStatus = async (req: Request, res: Response) => {
  try {
    const { currentStatus, latitude, longitude } = req.body;
    const update: any = {};

    if (currentStatus) update.currentStatus = currentStatus;
    if (typeof latitude === "number" && typeof longitude === "number") {
      update.location = { latitude, longitude, lastUpdated: new Date() };
    }

    const partner = await DeliveryPartner.findByIdAndUpdate(req.params.id, update, { new: true });

    // Notify admin when driver status changes
    if (partner && currentStatus && partner.adminId) {
      await sendNotification({
        recipientType: "admin",
        type: "delivery",
        recipientId: partner.adminId.toString(),
        title: `Driver ${partner.name} is now ${currentStatus}`,
        message: `${partner.name} changed status to ${currentStatus}`,
      });
    }

    res.json(partner);
  } catch (err) {
    console.error("updatePartnerStatus:", err);
    res.status(500).json({ message: "Failed to update partner status" });
  }
};

/* ===========================
   DELIVERY ASSIGNMENT & MANAGEMENT
   =========================== */
export const assignDelivery = async (req: Request, res: Response) => {
  try {
    const { userId, orderId, driverId } = req.body;

    if (!userId || !orderId || !driverId) {
      return res.status(400).json({ message: "userId, orderId, and driverId are required" });
    }

    // 1️⃣ Find the order by orderId (not just userId)
    const order = await DailyOrder.findById(orderId).populate("meals.productId");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Prepare deliveredProducts array from meals
    const deliveredProducts = order.meals.map((meal: any) => ({
          productId: meal.productId?._id,
          name: meal.productId?.name,
          quantity: meal.quantity,
          price: meal.costPrice,    // use costPrice here
          costPrice: meal.costPrice,
          status: "pending",
        }));


    // 2️⃣ Create Delivery entry
    const delivery = await Delivery.create({
  orderId: order._id,
  customerId: userId,
  driverId: new Types.ObjectId(driverId),
  deliveryPartnerId: new Types.ObjectId(driverId),
  items: order.meals,
  totalAmount: order.meals.reduce((sum: number, m: any) => sum + (m.costPrice || 0) * m.quantity, 0),
  deliveryStatus: "assigned",
  assignedAt: new Date(),
  deliveredProducts,   // <-- costPrice is used for price field
});


    // 3️⃣ Update driver status
    await DeliveryPartner.findByIdAndUpdate(driverId, { currentStatus: "busy" });

    // 4️⃣ Update order status
    await DailyOrder.findByIdAndUpdate(orderId, { orderStatus: "out_for_delivery" });

    // 5️⃣ Notifications
    await sendNotification({
      recipientType: "driver",
      recipientId: driverId,
      type: "delivery",
      title: "New Delivery Assigned",
      message: `You have been assigned to order ${orderId}`,
      relatedDelivery: delivery.id.toString(),
    });

    await sendNotification({
      recipientType: "user",
      recipientId: userId,
      type: "driver assigned",
      title: "Driver Assigned",
      message: "Your order is out for delivery!",
      relatedDelivery: delivery.id.toString(),
    });

    res.json({ message: "Delivery assigned successfully", delivery });
  } catch (err) {
    console.error("assignDelivery:", err);
    res.status(500).json({ message: "Failed to assign delivery", error: err });
  }
};



export const updateDeliveryStatus = async (req: Request, res: Response) => {
  try {
    const { deliveryId, status } = req.body;
    if (!deliveryId || !status) {
      return res.status(400).json({ message: "deliveryId and status required" });
    }

    const update: any = { deliveryStatus: status };
    if (status === "picked_up") update.pickedUpAt = new Date();
    if (status === "delivered") update.deliveredAt = new Date();

    const delivery = await Delivery.findByIdAndUpdate(deliveryId, update, { new: true });
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    // Update driver stats and status
    if (delivery.driverId) {
      if (status === "delivered") {
        await DeliveryPartner.findByIdAndUpdate(delivery.driverId, {
          $inc: { totalDeliveries: 1, completedDeliveries: 1 },
          currentStatus: "available",
        });
      } else if (status === "picked_up") {
        await DeliveryPartner.findByIdAndUpdate(delivery.driverId, { currentStatus: "busy" });
      }
    }

    // Notify driver
    if (delivery.driverId) {
      await sendNotification({
        recipientType: "driver",
        recipientId: delivery.driverId.toString(),
        type: "delivery",
        title: `Delivery Status Updated: ${status}`,
        message: `Delivery ${delivery._id} is now ${status}`,
      });
    }

    // Notify user
    if (delivery.customerId) {
      await sendNotification({
        recipientType: "user",
        recipientId: delivery.customerId.toString(),
        type: "order",
        title: `Your order is ${status}`,
        message: `Delivery ${delivery._id} status updated to ${status}`,
      });
    }

    // Notify admin
    if (delivery.restaurantId) {
      await sendNotification({
        recipientType: "admin",
        recipientId: delivery.restaurantId.toString(),
        type: "delivery",
        title: "Delivery Status Updated",
        message: `Delivery ${deliveryId} status: ${status}`,
        relatedDelivery: deliveryId,
      });
    }

    res.json(delivery);
  } catch (err) {
    console.error("updateDeliveryStatus:", err);
    res.status(500).json({ message: "Failed to update delivery status" });
  }
};

export const deliverOrder = async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.params;

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    // Get order product details
    const dailyOrder = await DailyOrder.findById(delivery.orderId);
    if (!dailyOrder) return res.status(404).json({ message: "Daily order not found" });

    delivery.deliveryStatus = "delivered";
    delivery.deliveredAt = new Date();

    // Save delivered products
    delivery.deliveredProducts = dailyOrder.meals.map(m => ({
      productId: m.productId,
      name: m.productId.toString(), // replace with populated name if needed
      quantity: m.quantity || 1,
      price: m.price || 0
    }));

    await delivery.save();

    // Update driver stats
    if (delivery.driverId) {
      await DeliveryPartner.findByIdAndUpdate(delivery.driverId, {
        $inc: { totalDeliveries: 1, completedDeliveries: 1 },
        currentStatus: "available"
      });
    }

    // Notify customer
    if (delivery.customerId) {
      await sendNotification({
        recipientType: "user",
        recipientId: delivery.customerId.toString(),
        type: "order",
        title: "Order Delivered",
        message: `Your order ${delivery.orderId} has been delivered.`,
        relatedDelivery: deliveryId,
      });
    }

    res.json({ message: "Order delivered successfully", delivery });
  } catch (err) {
    console.error("deliverOrder:", err);
    res.status(500).json({ message: "Failed to deliver order" });
  }
};

/* ===========================
   DELIVERY TRACKING
   =========================== */

export const trackDelivery = async (req: Request, res: Response) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate("driverId", "name phone vehicleType vehicleNumber location"); // populate location
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    // Type assertion: tell TS this is now a populated driver object
    const driver = delivery.driverId as unknown as IDeliveryPartner | null;

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
  } catch (err) {
    console.error("trackDelivery:", err);
    res.status(500).json({ message: "Failed to track delivery" });
  }
};


export const getAllDeliveries = async (_req: Request, res: Response) => {
  try {
    const deliveries = await Delivery.find()
      .populate("driverId", "name phone") // driver details
      .populate("customerId", "name email phone") // customer details
      .populate({
        path: "orderId", 
        model:DailyOrder,             // populate the order
        select: "subscriptionId meals", // select fields you need
        populate: {
          path: "subscriptionId",    // nested populate subscription
          select: "planName planType price duration", // subscription details
        },
      });

    res.json(deliveries);
  } catch (err) {
    console.error("getAllDeliveries:", err);
    res.status(500).json({ message: "Failed to fetch deliveries" });
  }
};


/* ===========================
   STATISTICS & ANALYTICS
   =========================== */

export const getDriverStats = async (req: Request, res: Response) => {
  try {
    const driverId = req.params.id;
    const partner = await DeliveryPartner.findById(driverId);

    if (!partner) return res.status(404).json({ message: "Driver not found" });

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
  } catch (err) {
    console.error("getDriverStats:", err);
    res.status(500).json({ message: "Failed to fetch driver stats" });
  }
};

export const getOverallStats = async (_req: Request, res: Response) => {
  try {
    // Drivers
    const totalDrivers = await DeliveryPartner.countDocuments();
    const activeDrivers = await DeliveryPartner.countDocuments({ currentStatus: "available" });
    const busyDrivers = await DeliveryPartner.countDocuments({ currentStatus: "busy" });

    // Deliveries
    const totalDeliveries = await Delivery.countDocuments();
    const completedDeliveries = await Delivery.countDocuments({ deliveryStatus: "delivered" });
    const pendingDeliveries = await Delivery.countDocuments({ deliveryStatus: "pending" });
    const assignedDeliveries = await Delivery.countDocuments({ deliveryStatus: "assigned" });
    const dispatchedDeliveries = await Delivery.countDocuments({ deliveryStatus: "dispatched" });
    const pickedUpDeliveries = await Delivery.countDocuments({ deliveryStatus: "picked_up" });
    const cancelledDeliveries = await Delivery.countDocuments({ deliveryStatus: "cancelled" });
    const failedDeliveries = await Delivery.countDocuments({ deliveryStatus: "failed" });

    // Optional: average delivery duration (for completed deliveries)
    const completed = await Delivery.find({ deliveryStatus: "delivered" })
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
  } catch (err) {
    console.error("getOverallStats:", err);
    res.status(500).json({ message: "Failed to fetch overall stats" });
  }
};




// Generate QR code for a driver
export const generateDriverQRCode = async (req: Request, res: Response) => {
  try {
    const driverId = req.params.id;
    const driver = await DeliveryPartner.findById(driverId);
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    const qrData = JSON.stringify({ driverId: driver.id.toString(), name: driver.name });
    const qrCodeURL = await QRCode.toDataURL(qrData); // returns base64 image URL

    res.json({ driverId: driver._id, qrCodeURL });
  } catch (err) {
    console.error("generateDriverQRCode:", err);
    res.status(500).json({ message: "Failed to generate QR code" });
  }
};



/* ===========================
   GET ORDERS ASSIGNED TO A DELIVERY PARTNER
   =========================== */
export const getPartnerOrders = async (req: Request, res: Response) => {
  try {
    const driverId = req.params.id;

    // Find deliveries assigned to this driver
   const deliveries = await Delivery.find({ driverId:driverId })
  .populate({
    path: "orderId",
    model: "DailyOrder",
  })
  .populate("customerId", "-password")
  .populate("deliveredProducts.productId")
  .lean();

    const formattedOrders = deliveries.map(d => {
      const dailyOrder = d.orderId as any; // populated DailyOrder
      const user = dailyOrder?.userId;

      return {
        deliveryId: d._id,
        status: d.deliveryStatus,
        assignedAt: d.assignedAt,
        pickedUpAt: d.pickedUpAt,
        deliveredAt: d.deliveredAt,
        customer: user ? { id: user._id, name: user.name, phone: user.phone } : null,
        meals: dailyOrder?.meals.map((m: any) => ({
          productId: m.productId._id,
          name: m.productId.name,
          price: m.productId.price,
          quantity: m.quantity,
        })),
        totalPrice: dailyOrder?.totalPrice,
      };
    });

    res.json({ orders: formattedOrders });
  } catch (err) {
    console.error("getPartnerOrders:", err);
    res.status(500).json({ message: "Failed to fetch partner orders" });
  }
};

/* ===========================
   ASSIGN ORDER TO DELIVERY PARTNER
   =========================== */
export const assignOrderToPartner = async (req: Request, res: Response) => {
  try {
    const { deliveryId, driverId } = req.body;

    if (!deliveryId || !driverId)
      return res.status(400).json({ message: "deliveryId and driverId required" });

    // Assign delivery
    const delivery = await Delivery.findByIdAndUpdate(
      deliveryId,
      {
        driverId: new Types.ObjectId(driverId),
        deliveryStatus: "assigned",
        assignedAt: new Date(),
      },
      { new: true }
    ).populate({
      path: "orderId",
      populate: { path: "meals.productId userId" },
    });

    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    // Update driver status to busy
    await DeliveryPartner.findByIdAndUpdate(driverId, { currentStatus: "busy" });

    // Send notifications
    const dailyOrder = delivery.orderId as any;
    const customer = dailyOrder?.userId;

    await sendNotification({
      recipientType: "driver",
      recipientId: driverId,
      type: "delivery",
      title: "New Delivery Assigned",
      message: `You have been assigned delivery ${deliveryId}`,
      relatedDelivery: deliveryId,
    });

    if (customer) {
      await sendNotification({
        recipientType: "user",
        recipientId: customer._id.toString(),
        type: "order",
        title: "Driver Assigned",
        message: `A driver has been assigned to your order.`,
        relatedDelivery: deliveryId,
      });
    }

    res.json({ message: "Order assigned to driver successfully", delivery });
  } catch (err) {
    console.error("assignOrderToPartner:", err);
    res.status(500).json({ message: "Failed to assign order" });
  }
};

/* ===========================
   UPDATE DELIVERY STATUS
   =========================== */
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.params; // from URL
    const { status } = req.body; // from body
    if (!status) return res.status(400).json({ message: "status required" });

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    const update: any = { deliveryStatus: status };
    if (status === "picked_up") update.pickedUpAt = new Date();
    if (status === "delivered") update.deliveredAt = new Date();

    await Delivery.findByIdAndUpdate(deliveryId, update, { new: true });

    // Update driver stats
    if (delivery.driverId) {
      if (status === "picked_up") {
        await DeliveryPartner.findByIdAndUpdate(delivery.driverId, { currentStatus: "busy" });
      } else if (status === "delivered") {
        await DeliveryPartner.findByIdAndUpdate(delivery.driverId, {
          $inc: { totalDeliveries: 1, completedDeliveries: 1 },
          currentStatus: "available",
        });
      }
    }

    // Notifications
    if (delivery.driverId) {
      await sendNotification({
        recipientType: "driver",
        recipientId: delivery.driverId.toString(),
        type: "delivery",
        title: `Delivery Status Updated: ${status}`,
        message: `Delivery ${delivery._id} is now ${status}`,
      });
    }

    if (delivery.customerId) {
      await sendNotification({
        recipientType: "user",
        recipientId: delivery.customerId.toString(),
        type: "order",
        title: `Your order is ${status}`,
        message: `Delivery ${delivery._id} status updated to ${status}`,
      });
    }

    res.json({ message: "Delivery status updated", deliveryId, status });
  } catch (err) {
    console.error("updateOrderStatus:", err);
    res.status(500).json({ message: "Failed to update delivery status" });
  }
};

export const getOrdersByDriver = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    if (!driverId || !Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({ message: "Invalid driver ID" });
    }

    const deliveries = await Delivery.find({ driverId })
      .populate({
        path: "customerId",
        select: "_id name email phone",
      })
      .populate({
        path: "orderId", // or "dailyOrderId" depending on your schema
        model: DailyOrder,
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
  } catch (err: any) {
    console.error("Error fetching driver orders:", err);
    return res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};


/* ===========================
   AUTO-ASSIGN DELIVERY TO AVAILABLE DRIVER
   =========================== */
/* ===========================
   AUTO-ASSIGN DELIVERY TO AVAILABLE DRIVER (TS SAFE)
   =========================== */
export const autoAssignDelivery = async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.body;
    if (!deliveryId) return res.status(400).json({ message: "deliveryId required" });

    // Find the delivery
    const delivery = await Delivery.findById(deliveryId).populate("orderId");
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    // Find an available driver
    const driver = await DeliveryPartner.findOne({ currentStatus: "available" });
    if (!driver) return res.status(400).json({ message: "No available drivers at the moment" });

    // Assign delivery to driver using .set() (TypeScript safe)
    delivery.set("driverId", driver._id);
    delivery.set("deliveryStatus", "assigned");
    delivery.set("assignedAt", new Date());
    await delivery.save();

    // Update driver status to busy
    driver.set("currentStatus", "busy");
    await driver.save();

    // Notifications
    const dailyOrder = delivery.orderId as any;
    const customer = dailyOrder?.userId;

    await sendNotification({
      recipientType: "driver",
      recipientId: driver.id.toString(),
      type: "delivery",
      title: "New Delivery Assigned",
      message: `You have been assigned delivery ${deliveryId}`,
      relatedDelivery: deliveryId,
    });

    if (customer) {
      await sendNotification({
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
  } catch (err) {
    console.error("autoAssignDelivery:", err);
    res.status(500).json({ message: "Failed to auto-assign delivery" });
  }
};
