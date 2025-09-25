import { IUser } from "../models/User"; // adjust path if needed

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      _id: string;
      role: string;
      email?: string;
      username?: string;
    };
  }
}
