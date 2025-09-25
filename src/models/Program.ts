// Program.ts
import { Schema, model, Document } from "mongoose";
import { IProduct } from "./Product";
import { Types } from "mongoose";
export interface IProgram extends Document {
  title: string;
  subtitle?: string;
  tagline?: string;
  description?: string;
  category: string;
  image?: string;
  product: IProduct[]; // embedded products
  createdAt: Date;
  updatedAt: Date;
}



const ProgramSchema = new Schema<IProgram>(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    tagline: { type: String },
    description: { type: String },
    category: {
      type: String,
      enum: [
        "diet",
        "bodybuilding",
        "yoga",
        "wellness",
        "vegan diet",
        "healthy food",
        "keto diet",
        "intermittent fasting",
        "weight loss",
        "strength training",
        "cardio",
        "pilates",
        "meditation",
      ],
      required: true,
    },
   product: [{ type: Types.ObjectId, ref: "Product" }],
    image: { type: String },
  },
  { timestamps: true }
);

export default model<IProgram>("Program", ProgramSchema);
