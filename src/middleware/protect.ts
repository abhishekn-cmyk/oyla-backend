import jwt, { JwtPayload } from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import asyncHandler from "express-async-handler";
import SuperAdmin from "../models/SuperAdmin";
import User from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

interface AuthRequest extends Request {
  user?: any;
}
export const generateToken = (userId: string, role: string) => { return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: "30d" }); };
export const protect = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Not authorized, no token" });
      throw new Error("Not authorized, no token");
    }

    const token = authHeader.split(" ")[1];

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
      res.status(401).json({ success: false, message: "Token is invalid" });
      throw new Error("Token is invalid");
    }

    // Make role case-insensitive
    const role = decoded.role?.toLowerCase();

    let user;
    if (role === "user") user = await User.findById(decoded.id);
    else if (role === "superadmin") user = await SuperAdmin.findById(decoded.id);
   console.log(user);
    if (!user) {
      res.status(401).json({ success: false, message: "User not found" });
      throw new Error("User not found");
    }

    req.user = user;
    next();
  }
);


