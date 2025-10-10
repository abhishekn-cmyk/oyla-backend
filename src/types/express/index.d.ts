// src/types/express.d.ts
import { IUser } from "../models/User"; // adjust path if needed

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        role: string;
        email?: string;
        username?: string;
      };
      superadmin?: {
        _id: string;
        role: string;
        email?: string;
      };
    }
  }
}
