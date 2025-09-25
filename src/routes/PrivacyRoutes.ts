import express from "express";
import {
  createPrivacyPolicy,
  updatePrivacyPolicy,
  getActivePrivacyPolicy,
  getAllPrivacyPolicies,
} from "../controllers/privacyController";
import { protect } from "../middleware/protect";
import { requireSuperAdmin, requireUser } from "../middleware/auth";

const router = express.Router();

// Admin routes
router.post("/create",protect,requireSuperAdmin, createPrivacyPolicy);
router.put("/update/:policyId",protect,requireSuperAdmin, updatePrivacyPolicy);

// Public routes
router.get("/active",protect,requireUser, getActivePrivacyPolicy);
router.get("/all", protect,requireUser,getAllPrivacyPolicies);

export default router;
