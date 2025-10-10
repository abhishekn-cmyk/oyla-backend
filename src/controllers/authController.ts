import { Request, Response } from "express";
import User from "../models/User";
import { hashPassword, comparePassword } from "../util/hash";
import crypto from "crypto";
import moment from "moment";
import { generateToken } from "../middleware/protect"; // your JWT generator

// ==================== Signup ====================
export const signup = async (req: Request, res: Response) => {
  console.log("Signup request body:", req.body);
  const { email, password, username } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email exists" });

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      email,
      password: hashedPassword,
      username,
      isVerified: false,
    });

    res.status(201).json({ user, message: "Signup successful, verify OTP" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: err });
  }
};

// ==================== Login ====================
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.password) return res.status(400).json({ message: "Use social login" });

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = generateToken(user.id.toString(), user.role);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.username || user.email || "User",
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message || err });
  }
};

// ==================== Send OTP ====================
export const sendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otpCode = crypto.randomInt(100000, 999999).toString();
    user.otpCode = otpCode;
    await user.save();

    // TODO: send OTP to email/mobile
    res.status(200).json({ message: "OTP sent", otp: otpCode }); // remove otp in production
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ error: err });
  }
};

// ==================== Verify OTP ====================
export const verifyOtp = async (req: Request, res: Response) => {
  const { email, otpCode } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.otpCode !== otpCode) return res.status(400).json({ message: "Invalid OTP" });

    user.isVerified = true;
    user.otpCode = undefined;
    await user.save();

    res.status(200).json({ message: "OTP verified", user });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: err });
  }
};

// ==================== Social Login ====================
export const socialLogin = async (req: Request, res: Response) => {
  const { email, googleId, facebookId, firstName, lastName } = req.body;
  try {
    let user = await User.findOne({ email });

    if (user) {
      if (googleId && !user.googleId) user.googleId = googleId;
      if (facebookId && !user.facebookId) user.facebookId = facebookId;
      user.isVerified = true;
      await user.save();
    } else {
      user = await User.create({
  email,
  googleId,
  facebookId,
  isVerified: true,
  profile: {
    selectedPrograms: [],
    firstName: firstName || "",
    lastName: lastName || "",
    dob: undefined,
    gender: undefined,
    address: undefined,
    mobileNumber: undefined,
    profileImage: undefined,
  },
});

    }

    res.status(200).json({ user });
  } catch (err) {
    console.error("Social login error:", err);
    res.status(500).json({ error: err });
  }
};

// ==================== Update Profile ====================
export const updateProfile = async (req: Request, res: Response) => {
  const { email, firstName, lastName, dob, gender, address, mobileNumber } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Ensure profile exists
    if (!user.profile) {
      user.profile = {
        selectedPrograms: [],
        firstName: "",
        lastName: "",
        dob: undefined,
        gender: undefined,
        address: undefined,
        mobileNumber: undefined,
        profileImage: undefined,
      };
    }

    let dobDate = user.profile.dob;
    if (dob) {
      const parsedDob = moment(dob, "DD-MM-YYYY", true);
      if (parsedDob.isValid()) {
        dobDate = parsedDob.toDate();
      } else {
        return res.status(400).json({ message: "Invalid date format. Use DD-MM-YYYY" });
      }
    }

    const profileImage = req.file ? req.file.path : user.profile.profileImage;

    user.profile = {
      selectedPrograms: user.profile.selectedPrograms || [],
      firstName: firstName || user.profile.firstName || "",
      lastName: lastName || user.profile.lastName || "",
      dob: dobDate,
      gender: gender || user.profile.gender || "",
      address: address || user.profile.address || "",
      mobileNumber: mobileNumber || user.profile.mobileNumber || "",
      profileImage,
    };

    await user.save();

    const responseUser = {
      ...user.toObject(),
      profile: {
        ...user.profile,
        dob: user.profile.dob ? moment(user.profile.dob).format("DD-MM-YYYY") : null,
      },
    };

    res.status(200).json({ message: "Profile updated", user: responseUser });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: err });
  }
};

// ==================== Post Profile ====================
export const PostProfile = async (req: Request, res: Response) => {
  const { email, firstName, lastName, dob, gender, address, mobileNumber } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.profile) {
      user.profile = {
        selectedPrograms: [],
        firstName: "",
        lastName: "",
        dob: undefined,
        gender: undefined,
        address: undefined,
        mobileNumber: undefined,
        profileImage: undefined,
      };
    }

  let dobDate: Date | undefined = user.profile?.dob || undefined;

    if (dob) {
      const parsedDob = moment(dob, "DD-MM-YYYY", true);
      if (parsedDob.isValid()) {
        dobDate = parsedDob.toDate();
      } else {
        return res.status(400).json({ message: "Invalid date format. Use DD-MM-YYYY" });
      }
    } else {
      dobDate = undefined;
    }

    const profileImage = req.file ? req.file.path : user.profile.profileImage;

    user.profile = {
      selectedPrograms: user.profile.selectedPrograms || [],
      firstName: firstName || user.profile.firstName || "",
      lastName: lastName || user.profile.lastName || "",
      dob: dobDate,
      gender: gender || user.profile.gender || "",
      address: address || user.profile.address || "",
      mobileNumber: mobileNumber || user.profile.mobileNumber || "",
      profileImage,
    };

    await user.save();

    const responseUser = {
      ...user.toObject(),
      profile: {
        ...user.profile,
        dob: user.profile.dob ? moment(user.profile.dob).format("DD-MM-YYYY") : null,
      },
    };

    res.status(200).json({ message: "Profile added", user: responseUser });
  } catch (err) {
    console.error("Post profile error:", err);
    res.status(500).json({ error: err });
  }
};

// ==================== Get User by ID ====================
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "User ID is required" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const responseUser = {
      ...user.toObject(),
      profile: {
        ...user.profile,
        dob: user.profile?.dob ? moment(user.profile.dob).format("DD-MM-YYYY") : null,
      },
    };

    res.status(200).json({ user: responseUser });
  } catch (err) {
    console.error("Get user by ID error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ==================== Get All Users ====================
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find();

    const responseUsers = users.map((user) => ({
      ...user.toObject(),
      profile: {
        ...user.profile,
        dob: user.profile?.dob ? moment(user.profile.dob).format("DD-MM-YYYY") : null,
      },
    }));

    res.status(200).json({ users: responseUsers });
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
