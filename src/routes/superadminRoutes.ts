import express from "express";

import {
  registerSuperAdmin,
  loginSuperAdmin,
  updateSuperAdminProfile,getPolicies,updatePolicies,
  updateSuperAdminPassword
} from "../controllers/superadminController";

const router = express.Router();
import { upload } from "../middleware/upload";

router.post("/register", registerSuperAdmin);
router.post("/login", loginSuperAdmin);
router.put("/update-profile/:id", upload.single("profileImage"), updateSuperAdminProfile);
router.put("/update-password/:id", updateSuperAdminPassword);
router.get("/:id/policies", getPolicies);

// Update policies for a superadmin
router.put("/:id/policies", updatePolicies);
export default router;
