import { Request, Response, NextFunction } from "express";

import SuperAdmin from "../models/SuperAdmin";

// Middleware to check if user is an admin
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers["user-id"] as string; // Example: pass user ID in header
    if (!userId) return res.status(401).json({ message: "Unauthorized: User ID missing" });

    const user = await SuperAdmin.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role !== "superadmin") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
