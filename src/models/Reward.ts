import { Schema, model, Document, Types } from "mongoose";

export interface IReward extends Document {
  title: string;              // e.g., "10% Off Coupon"
  description?: string;       // Optional description
  type: "percentage" | "fixed" | "points"; // type of reward
  value: number;              // e.g., 10 (for 10% or 10 points)
  code?: string;              // Optional coupon code
  expiryDate?: Date;          // Optional expiration date
  isActive?: boolean;         // If reward is active
  users?: Types.ObjectId[];  
   redeemedUsers?: Types.ObjectId[]; // Users who have claimed/redeemed this reward
}

const RewardSchema = new Schema<IReward>(
  {
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ["percentage", "fixed", "points"], required: true },
    value: { type: Number, required: true },
    code: { type: String, unique: true, sparse: true },
    expiryDate: { type: Date,index: { expireAfterSeconds: 0 } },
    isActive: { type: Boolean, default: true },
    users: [{ type: Schema.Types.ObjectId, ref: "User" }],
     redeemedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default model<IReward>("Reward", RewardSchema);
