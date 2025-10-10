import express from "express";
import {
  createPrivacyPolicy,
  updatePrivacyPolicy,
  getActivePrivacyPolicy,
  getAllPrivacyPolicies,
  deletePrivacyPolicy,
} from "../controllers/privacyController";
import { protect } from "../middleware/protect";
import { authorize } from "../middleware/auth";

const router = express.Router();

// ------------------ SUPERADMIN ROUTES ------------------
// Create a privacy policy
router.post("/create", protect, authorize(["superadmin"]), createPrivacyPolicy);

// Update a privacy policy
router.put("/update/:policyId", protect, authorize(["superadmin"]), updatePrivacyPolicy);

// ------------------ USER / PUBLIC ROUTES ------------------
// Get active privacy policy
router.get("/active", protect, authorize(["user"]), getActivePrivacyPolicy);

// Get all privacy policies (public)
router.get("/all", getAllPrivacyPolicies);

// Delete a privacy policy
router.delete("/delete/:policyId", protect, authorize(["superadmin"]), deletePrivacyPolicy);

export default router;
