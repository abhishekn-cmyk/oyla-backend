import express from "express";
import { addToCart,deleteCartItem,getCartByUser,getFullCart,updateCartItem } from "../controllers/CartController";

import { protect } from "../middleware/protect";
import { requireUser, requireAdmin, requireSuperAdmin } from "../middleware/auth";
const router=express.Router();



router.get('/:userId', protect,requireUser,getCartByUser);

router.post('/:productId/:userId/add',protect,requireUser,addToCart);

router.put('/:productId/:userId/update',protect,requireUser,updateCartItem);

router.delete('/:productId/:userId/delete',protect,requireUser,deleteCartItem);

router.get('/full/cart-details',protect,requireSuperAdmin,getFullCart);


export default router;