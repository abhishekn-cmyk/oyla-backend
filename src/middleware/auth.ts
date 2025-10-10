import { Response, NextFunction } from "express";
import { AuthRequest, UserRole } from "./Authrequest";

export const authorize = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(403).json({ success: false, message: "Access denied: No user found" });
      return;
    }

    const userRole = req.user.role as UserRole; // <--- type assertion

    // superadmin bypass
    if (userRole === "superadmin" || roles.includes(userRole)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: "Access denied: You do not have the required role.",
    });
  };
};
