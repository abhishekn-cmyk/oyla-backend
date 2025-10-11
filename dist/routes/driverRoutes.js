"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const driverController_1 = require("../controllers/driverController");
const router = express_1.default.Router();
/* ===========================
   👨‍✈️ Delivery Partner Auth & CRUD
   =========================== */
router.post("/partners/register", driverController_1.createPartner); // Register partner
router.post("/create/delivery", driverController_1.createDelveryPartner); // Another way to create partner
router.post("/partners/login", driverController_1.loginPartner); // Login partner
router.get("/partners", driverController_1.getAllPartners); // Get all partners
router.get("/partners/:id", driverController_1.getPartnerById); // Get partner by ID
router.put("/partners/:id", driverController_1.updatePartner); // Update partner info
router.delete("/partners/:id", driverController_1.deletePartner); // Delete partner
router.put("/partners/:id/status", driverController_1.updatePartnerStatus); // Update partner status
router.put("/partners/:id/toggle-status", driverController_1.toggleStatus); // Toggle availability/offline/busy
router.get("/partners/:id/qrcode", driverController_1.generateDriverQRCode); // Generate QR code for driver
/* ===========================
   🚚 Delivery Management
   =========================== */
// Get deliveries
router.get("/deliveries", driverController_1.getAllDeliveries); // Get all deliveries
router.get("/partners/:id/orders", driverController_1.getPartnerOrders); // Get orders assigned to a partner
// Assignments
router.post("/deliveries/assign", driverController_1.assignDelivery); // Assign delivery manually
router.post("/deliveries/auto-assign", driverController_1.autoAssignDelivery); // Auto-assign delivery to available driver
router.post("/deliveries/assign-to-partner", driverController_1.assignOrderToPartner); // Assign specific order to a driver
// Update delivery status
router.put("/deliveries/status", driverController_1.updateDeliveryStatus); // Update delivery status manually
router.put("/deliveries/:id/deliver", driverController_1.deliverOrder); // Mark delivery as delivered
router.put("/deliveries/:deliveryId/update-order", driverController_1.updateOrderStatus); // Update order details/status
router.get("/:driverId/orders", driverController_1.getOrdersByDriver);
// Track delivery
router.get("/deliveries/:id/track", driverController_1.trackDelivery); // Track delivery with driver location
/* ===========================
   📊 Stats & Analytics
   =========================== */
router.get("/stats/drivers/:id", driverController_1.getDriverStats); // Driver-specific stats
router.get("/stats/overview", driverController_1.getOverallStats); // Overall system stats
exports.default = router;
