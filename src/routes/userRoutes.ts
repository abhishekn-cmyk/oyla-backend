import { Router } from "express";
import {
  signup,
  login,
  sendOtp,
  verifyOtp,
  socialLogin,
  updateProfile,
  getAllUsers,
  getUserById,
  PostProfile,
} from "../controllers/authController";
import { upload } from "../middleware/upload";
const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/social-login", socialLogin);
router.put("/update-profile", upload.single("profileImage"), updateProfile);
router.post('/post-profile',upload.single("profileImage"),PostProfile);
router.get('/users',getAllUsers);
router.get('/user/:id',getUserById);

export default router;
