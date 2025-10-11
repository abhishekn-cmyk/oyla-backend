"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(403).json({ success: false, message: "Access denied: No user found" });
            return;
        }
        const userRole = req.user.role; // <--- type assertion
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
exports.authorize = authorize;
