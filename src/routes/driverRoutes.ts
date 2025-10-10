import express from "express";
import {
  createPartner,
  createDelveryPartner,
  loginPartner,
  getAllPartners,
  getPartnerById,
  updatePartner,getOrdersByDriver,
  deletePartner,
  updatePartnerStatus,
  toggleStatus,
  assignDelivery,
  autoAssignDelivery,
  assignOrderToPartner,
  deliverOrder,
  trackDelivery,
  updateDeliveryStatus,
  getAllDeliveries,
  getDriverStats,
  getPartnerOrders,
  updateOrderStatus,
  getOverallStats,
  generateDriverQRCode
} from "../controllers/driverController";

const router = express.Router();

/* ===========================
   👨‍✈️ Delivery Partner Auth & CRUD
   =========================== */
router.post("/partners/register", createPartner);           // Register partner
router.post("/create/delivery", createDelveryPartner);      // Another way to create partner
router.post("/partners/login", loginPartner);               // Login partner
router.get("/partners", getAllPartners);                    // Get all partners
router.get("/partners/:id", getPartnerById);               // Get partner by ID
router.put("/partners/:id", updatePartner);                // Update partner info
router.delete("/partners/:id", deletePartner);             // Delete partner
router.put("/partners/:id/status", updatePartnerStatus);   // Update partner status
router.put("/partners/:id/toggle-status", toggleStatus);   // Toggle availability/offline/busy
router.get("/partners/:id/qrcode", generateDriverQRCode);  // Generate QR code for driver

/* ===========================
   🚚 Delivery Management
   =========================== */
// Get deliveries
router.get("/deliveries", getAllDeliveries);               // Get all deliveries
router.get("/partners/:id/orders", getPartnerOrders);      // Get orders assigned to a partner

// Assignments
router.post("/deliveries/assign", assignDelivery);         // Assign delivery manually
router.post("/deliveries/auto-assign", autoAssignDelivery);// Auto-assign delivery to available driver
router.post("/deliveries/assign-to-partner", assignOrderToPartner); // Assign specific order to a driver

// Update delivery status
router.put("/deliveries/status", updateDeliveryStatus);    // Update delivery status manually
router.put("/deliveries/:id/deliver", deliverOrder);       // Mark delivery as delivered
router.put("/deliveries/:deliveryId/update-order", updateOrderStatus); // Update order details/status
router.get("/:driverId/orders", getOrdersByDriver);
// Track delivery
router.get("/deliveries/:id/track", trackDelivery);        // Track delivery with driver location

/* ===========================
   📊 Stats & Analytics
   =========================== */
router.get("/stats/drivers/:id", getDriverStats);          // Driver-specific stats
router.get("/stats/overview", getOverallStats);           // Overall system stats

export default router;
