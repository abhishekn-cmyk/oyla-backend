import { NextFunction, Request, Response } from "express";

type UserRole = "SuperAdmin" | "User";

interface AuthRequest extends Request {
  user?: { role: string ,_id: string,
        // Add this required property
        email?: string,
        username?: string };
}

export const authorize = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No user found.",
      });
    }

    const userRole = req.user.role.toLowerCase();

    // SuperAdmin always allowed
    if (userRole === "superadmin") {
      return next();
    }

    // Check if user's role is in allowed roles (case-insensitive)
    const allowedRoles = roles.map(r => r.toLowerCase());
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You do not have the required role.",
      });
    }

    next();
  };
};
