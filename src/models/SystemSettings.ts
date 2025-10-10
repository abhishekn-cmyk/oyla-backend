import { Schema, model, Document } from "mongoose";

export interface ISystemSettings extends Document {
  key: string;
  value: any;
  description?: string;
  category: "subscription" | "delivery" | "notification" | "payment" | "general";
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ["subscription", "delivery", "notification", "payment", "general"],
      required: true
    }
  },
  { timestamps: true }
);

export default model<ISystemSettings>("SystemSettings", SystemSettingsSchema);