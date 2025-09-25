import { Document } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        role: string; // Add this required property
        email?: string;
        username?: string;
        // Add other properties your user object has
      };
    }
  }
}