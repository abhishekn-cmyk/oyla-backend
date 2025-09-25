import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import User from '../models/User';
import SuperAdmin from '../models/SuperAdmin';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware to protect routes
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');

    const decoded = jwt.verify(token, secret) as JwtPayload & { role: string };

    let user;
    if (decoded.role === 'superadmin') {
      user = await SuperAdmin.findById(decoded.sub || decoded.id).select('-password');
    } else {
      user = await User.findById(decoded.sub || decoded.id).select('-password');
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error.message || error);
    res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

// Generate JWT token
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
