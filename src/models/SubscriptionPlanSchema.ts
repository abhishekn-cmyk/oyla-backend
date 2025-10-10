import { Schema, model, Document } from "mongoose";

export interface ISubscriptionPlan extends Document {
  name: string; // e.g., "7 Days Basic"
  durationDays: number;
  mealsPerDay: number; // 2 or 3
  basePrice: number; // ₹150
  discountPercent?: number; // 5%, 10%
  changeWindowDays: number; // default 3
  autoRenewalAllowed: boolean;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true },
    durationDays: { type: Number, required: true },
    mealsPerDay: { type: Number, enum: [2, 3], required: true },
    basePrice: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    changeWindowDays: { type: Number, default: 3 },
    autoRenewalAllowed: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default model<ISubscriptionPlan>("SubscriptionPlan", SubscriptionPlanSchema);
