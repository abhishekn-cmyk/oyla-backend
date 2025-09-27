"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const authorize = (roles) => {
    return (req, res, next) => {
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
exports.authorize = authorize;
