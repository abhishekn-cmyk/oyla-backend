import { Request, Response, NextFunction } from 'express';

// Define roles
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin'
}

// Higher-order function for role authorization
export const authorize = (roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

// Specific role middlewares
export const requireUser = authorize([UserRole.USER]);
export const requireAdmin = authorize([UserRole.ADMIN, UserRole.SUPERADMIN]);
export const requireSuperAdmin = authorize([UserRole.SUPERADMIN]);

// Check if user is authenticated and is the same user or admin
export const requireSameUserOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  // Allow if user is admin or superadmin
  if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPERADMIN) {
    return next();
  }

  // Allow if user is accessing their own resource
  if (req.user.id === req.params.id) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Not authorized to access this resource'
  });
};
