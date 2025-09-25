import express from "express";

import {
  registerSuperAdmin,
  loginSuperAdmin,
  updateSuperAdminProfile,
  updateSuperAdminPassword
} from "../controllers/superadminController";

const router = express.Router();
import { upload } from "../middleware/upload";

router.post("/register", registerSuperAdmin);
router.post("/login", loginSuperAdmin);
router.put("/update-profile/:id", upload.single("profileImage"), updateSuperAdminProfile);
router.put("/update-password/:id", updateSuperAdminPassword);

export default router;
