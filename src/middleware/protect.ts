import { Response, NextFunction } from "express";
import jwt, {SignOptions, JwtPayload } from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User, { IUser } from "../models/User";
import SuperAdmin, { ISuperAdmin } from "../models/SuperAdmin";
import { AuthRequest } from "./Authrequest"; // import the interface
export const protect = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
       res.status(401).json({ success: false, message: "Not authorized, no token" });return;
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    if (!decoded.sub || !decoded.role) {
      res.status(401).json({ success: false, message: "Token payload invalid" });return;
    }

    let user: IUser | ISuperAdmin | null = null;

    if (decoded.role.toLowerCase() === "superadmin") {
      user = await SuperAdmin.findById(decoded.sub).select("-password");
    } else {
      user = await User.findById(decoded.sub).select("-password");
    }

    if (!user) {
       res.status(401).json({ success: false, message: "User not found" });return;
    }

    // Map Mongoose document to plain object
    req.user = {
      _id: user.id.toString(),
      role: user.role,
      email: "email" in user ? user.email : undefined,
      username: "username" in user ? user.username : undefined,
    };

    next();
  } catch (err) {
    console.error("Protect middleware error:", err);
    res.status(401).json({ success: false, message: "Token is invalid or expired" });
  }
});


export const generateToken = (id: string, role: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');

  const payload = { sub: id, role };

  // Ensure expiresIn is correctly typed
  const expiresIn: `${number}${"s" | "m" | "h" | "d" | "y"}` = 
    (process.env.JWT_EXPIRE as `${number}${"s" | "m" | "h" | "d" | "y"}`) || '30d';

  const options: SignOptions = { expiresIn };

  return jwt.sign(payload, secret, options);
};