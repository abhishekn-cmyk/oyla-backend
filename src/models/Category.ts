import { Schema, model, Document } from "mongoose";

export interface ICategoryMaster extends Document {
  name: string;
  type: string; // "product" | "expense" | "other"
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryMasterSchema = new Schema<ICategoryMaster>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ["product", "expense", "other"] },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const CategoryMaster = model<ICategoryMaster>("CategoryMaster", CategoryMasterSchema);
