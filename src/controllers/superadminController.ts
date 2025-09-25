import { Request, Response } from "express";
import SuperAdmin from "../models/SuperAdmin";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ISuperAdmin } from "../models/SuperAdmin";
import { generateToken } from "../middleware/protect";
export const registerSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { username, email, password, mobileNumber } = req.body;

    const existing = await SuperAdmin.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const superadmin = await SuperAdmin.create({ username, email, password, mobileNumber });

    res.status(201).json({ message: "SuperAdmin registered", superadmin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
const createDefaultSuperAdmin = async () => {
  try {
    const defaultEmail = "oyla.admin@gmail.com";
    const defaultPassword = "oyla123";

    const existingAdmin = await SuperAdmin.findOne({ email: defaultEmail });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await new SuperAdmin({ email: defaultEmail, password: hashedPassword }).save();
      console.log("Default superadmin created in DB.");
    }
  } catch (err) {
    console.error("Error creating default superadmin:", err);
  }
};

export const loginSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    let superAdmin: ISuperAdmin | null = await SuperAdmin.findOne({ email });

    // If default superadmin does NOT exist, create it
    if (!superAdmin && email === "oyla.admin@gmail.com") {
      const hashedPassword = await bcrypt.hash(password, 10);
      superAdmin = await new SuperAdmin({
        email,
        password: hashedPassword,
        role: "SuperAdmin", // consistent role
      }).save();
      console.log("Default superadmin created in DB.");
    }

    // If still not found, reject login
    if (!superAdmin) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

   

    // Generate JWT token
    const token = generateToken(superAdmin._id.toString(), superAdmin.role);

    // Send response
    res.status(200).json({
      message: "Login successful",
      token,
      superadmin: {
        email: superAdmin.email,
        role: superAdmin.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
export const updateSuperAdminProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // SuperAdmin ID
    const { username, email, mobileNumber } = req.body;
    const profileImage = req.file ? req.file.path : undefined;

    const superadmin = await SuperAdmin.findById(id);
    if (!superadmin) return res.status(404).json({ message: "SuperAdmin not found" });

    superadmin.username = username || superadmin.username;
    superadmin.email = email || superadmin.email;
    superadmin.mobileNumber = mobileNumber || superadmin.mobileNumber;
    if (profileImage) superadmin.profileImage = profileImage;

    await superadmin.save();

    res.status(200).json({ message: "Profile updated", superadmin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
export const updateSuperAdminPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    const superadmin = await SuperAdmin.findById(id);
    if (!superadmin) return res.status(404).json({ message: "SuperAdmin not found" });

    const isMatch = await superadmin.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });

    superadmin.password = newPassword;
    await superadmin.save();

    res.status(200).json({ message: "Password updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
