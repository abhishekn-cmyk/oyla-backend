import { Request, Response } from "express";
import User from "../models/User";
import { hashPassword, comparePassword } from "../util/hash";
import crypto from "crypto";
import moment from "moment";

import { generateToken } from '../middleware/protect'; // your JWT generator
// ==================== Signup ====================
export const signup = async (req: Request, res: Response) => {
  console.log("Signup request body:", req.body);
  const { email, password, username } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    console.log("Existing user:", existingUser);

    if (existingUser) return res.status(400).json({ message: "Email exists" });

    const hashedPassword = await hashPassword(password);
    console.log("Hashed password:", hashedPassword);

    const user = await User.create({
      email,
      password: hashedPassword,
      username,
      isVerified: false,
    });
    console.log("Created user:", user);

    res.status(201).json({ user, message: "Signup successful, verify OTP" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: err });
  }
};

// ==================== Login ====================


export const login = async (req: Request, res: Response) => {
  console.log("Login request body:", req.body);
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    console.log("Found user:", user);

    if (!user) 
      return res.status(404).json({ message: "User not found" });

    if (!user.password) 
      return res.status(400).json({ message: "Use social login" });

    const isMatch = await comparePassword(password, user.password);
    console.log("Password match:", isMatch);

    if (!isMatch) 
      return res.status(400).json({ message: "Invalid password" });

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    res.status(200).json({ 
      message: "Login successful", 
      user: {
        id: user._id,
        name: user.username,
        password:user.password,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: err });
  }
};


// ==================== Send OTP ====================
export const sendOtp = async (req: Request, res: Response) => {
  console.log("Send OTP request body:", req.body);
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    console.log("Found user for OTP:", user);

    if (!user) return res.status(404).json({ message: "User not found" });

    const otpCode = crypto.randomInt(100000, 999999).toString();
    user.otpCode = otpCode;
    await user.save();

    console.log("Generated OTP:", otpCode);

    // TODO: send OTP to email or mobile
    res.status(200).json({ message: "OTP sent", otp: otpCode }); // remove otp in production
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ error: err });
  }
};


// ==================== Verify OTP ====================
export const verifyOtp = async (req: Request, res: Response) => {
  console.log("Verify OTP request body:", req.body);
  const { email, otpCode } = req.body;
  try {
    const user = await User.findOne({ email });
    console.log("Found user for OTP verification:", user);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.otpCode !== otpCode) {
      console.log("Invalid OTP. Expected:", user.otpCode, "Received:", otpCode);
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otpCode = undefined; // clear OTP
    await user.save();
    console.log("OTP verified, user updated:", user);

    res.status(200).json({ message: "OTP verified", user });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: err });
  }
};

// ==================== Social Login (Google / Facebook) ====================
export const socialLogin = async (req: Request, res: Response) => {
  console.log("Social login request body:", req.body);
  const { email, googleId, facebookId, firstName, lastName } = req.body;
  try {
    let user = await User.findOne({ email });
    console.log("Found user for social login:", user);

    if (user) {
      if (googleId && !user.googleId) user.googleId = googleId;
      if (facebookId && !user.facebookId) user.facebookId = facebookId;
      user.isVerified = true;
      await user.save();
      console.log("Updated social login user:", user);
    } else {
      user = await User.create({
        email,
        googleId,
        facebookId,
        isVerified: true,
        profile: { firstName, lastName },
      });
      console.log("Created social login user:", user);
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error("Social login error:", err);
    res.status(500).json({ error: err });
  }
};

// ==================== Update Profile ====================
export const updateProfile = async (req: Request, res: Response) => {
  console.log("Update profile request body:", req.body);
  console.log("Uploaded file:", req.file); // Multer file info

  const { email, firstName, lastName, dob, gender, address, mobileNumber } = req.body;

  try {
    const user = await User.findOne({ email });
    console.log("Found user for profile update:", user);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Convert DOB string to Date, fallback to existing value
    let dobDate = user.profile.dob;
    if (dob) {
      const parsedDob = moment(dob, "DD-MM-YYYY", true); // strict parsing
      if (parsedDob.isValid()) {
        dobDate = parsedDob.toDate();
      } else {
        return res.status(400).json({ message: "Invalid date format. Use DD-MM-YYYY" });
      }
    }

    const profileImage = req.file ? req.file.path : user.profile.profileImage;

    user.profile = {
      firstName: firstName || user.profile.firstName,
      lastName: lastName || user.profile.lastName,
      dob: dobDate,
      gender: gender || user.profile.gender,
      address: address || user.profile.address,
      mobileNumber: mobileNumber || user.profile.mobileNumber,
      profileImage,
    };

    await user.save();
    console.log("Updated user profile:", user);

    // Create a response object with formatted DOB
    const responseUser = {
      ...user.toObject(),
      profile: {
        ...user.profile,
        dob: moment(user.profile.dob).format("DD-MM-YYYY"), // string for frontend
      },
    };

    res.status(200).json({ message: "Profile updated", user: responseUser });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: err });
  }
};



export const PostProfile = async (req: Request, res: Response) => {
  console.log("Update profile request body:", req.body);
  console.log("Uploaded file:", req.file); // Multer file info

  const { email, firstName, lastName, dob, gender, address, mobileNumber } = req.body;

  try {
    const user = await User.findOne({ email });
    console.log("Found user for profile update:", user);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Ensure user.profile exists
    if (!user.profile) {
  user.profile = {
    firstName: "", // default empty string
    lastName: "",  // default empty string
    dob: undefined,
    gender: undefined,
    address: undefined,
    mobileNumber: undefined,
    profileImage: undefined,
  };
}

    // Convert DOB string to Date, fallback to existing value
   let dobDate: Date | undefined = user.profile.dob; // start with existing value

if (dob) {
  const parsedDob = moment(dob, "DD-MM-YYYY", true); // strict parsing
  if (parsedDob.isValid()) {
    dobDate = parsedDob.toDate();
  } else {
    return res.status(400).json({ message: "Invalid date format. Use DD-MM-YYYY" });
  }
} else {
  dobDate = undefined; // explicitly undefined if no DOB provided
}


    // Use uploaded file if present
    const profileImage = req.file ? req.file.path : user.profile.profileImage;

    // Update or add profile fields
    user.profile = {
      firstName: firstName || user.profile.firstName || "",
      lastName: lastName || user.profile.lastName || "",
      dob: dobDate,
      gender: gender || user.profile.gender || "",
      address: address || user.profile.address || "",
      mobileNumber: mobileNumber || user.profile.mobileNumber || "",
      profileImage,
    };

    await user.save();
    console.log("Updated user profile:", user);

    // Format DOB for frontend
    const responseUser = {
      ...user.toObject(),
      profile: {
        ...user.profile,
        dob: user.profile.dob ? moment(user.profile.dob).format("DD-MM-YYYY") : null,
      },
    };

    res.status(200).json({ message: "Profile added", user: responseUser });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: err });
  }
};
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // assuming route: /users/:id
    if (!id) return res.status(400).json({ message: "User ID is required" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Format DOB for frontend
    const responseUser = {
      ...user.toObject(),
      profile: {
        ...user.profile,
        dob: user.profile.dob ? moment(user.profile.dob).format("DD-MM-YYYY") : null,
      },
    };

    res.status(200).json({ user: responseUser });
  } catch (err) {
    console.error("Get user by ID error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find();

    // Format DOB for each user
    const responseUsers = users.map(user => ({
      ...user.toObject(),
      profile: {
        ...user.profile,
        dob: user.profile.dob ? moment(user.profile.dob).format("DD-MM-YYYY") : null,
      },
    }));

    res.status(200).json({ users: responseUsers });
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({ error: "Server error" });
  }
};