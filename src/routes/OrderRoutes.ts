import express from "express";
import { getAllOrders,checkout,getOrderById,getOrdersByUser,getOrdersByProduct, deleteOrderById, toggleOrderStatus } from "../controllers/OrderController";
import { protect } from "../middleware/protect";
import { requireUser, requireAdmin, requireSuperAdmin } from "../middleware/auth";
const router=express.Router();





router.post("/checkout/:userId",protect,requireUser, checkout);
router.get("/orders",protect,requireSuperAdmin, getAllOrders);
router.get("/orders/user/:userId",protect,requireUser, getOrdersByUser);
router.get("/orders/:orderId", getOrderById);
router.get("/orders/product/:productId", getOrdersByProduct);
router.get('/order/:id/delete',protect,requireUser,deleteOrderById);
router.put('/order/:id/status',protect,requireSuperAdmin,toggleOrderStatus);


export default router;