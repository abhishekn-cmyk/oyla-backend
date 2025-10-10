import { Request } from "express";

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: string;
    email?: string;
    username?: string;
  };
}
export type UserRole = "user" | "admin" | "superadmin" | "delivery_partner";
