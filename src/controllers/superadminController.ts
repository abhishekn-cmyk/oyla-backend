import { Request, Response } from "express";
import SuperAdmin from "../models/SuperAdmin";
import jwt from "jsonwebtoken";
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

export const loginSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const superadmin = await SuperAdmin.findOne({ email });
    if (!superadmin) return res.status(404).json({ message: "SuperAdmin not found" });

    const isMatch = await superadmin.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    // Create JWT token
    const token = jwt.sign(
      { id: superadmin._id, role: superadmin.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );

    res.status(200).json({ message: "Login successful", token, superadmin });
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
