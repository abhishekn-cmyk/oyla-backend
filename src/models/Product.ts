import { Schema, model, Document, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  tagline?: string;
  description?: string;
  price: number;
  image?: string;
  rating?: number;
  features:string;
  stock:number;
  nutrition?: {
    fat?: string;          // e.g., "10g"
    carbohydrate?: string; // e.g., "10g"
    protein?: string;      // optional
    calories?: string;     // optional
  };
  ingredients?: string[];
  mealType?: "veg" | "non-veg" | "vegan" | "breakfast" | "lunch" | "dinner "|"snack"|"soup"|"snack and soup";
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    tagline: { type: String },
    description: { type: String },
    price: { type: Number, required: true },
    image: { type: String },
    rating: { type: Number, default: 0 },
    stock: { type: Number, default: 0 }, 
    features:{type:String},
    nutrition: {
      fat: { type: String },
      carbohydrate: { type: String },
      protein: { type: String },
      calories: { type: String },
    },
    ingredients: [{ type: String }],
    mealType: { 
      type: String, 
      enum: ["veg", "non-veg", "vegan", "breakfast", "lunch", "dinner"] 
    },
  },
  { timestamps: true }
);

export default model<IProduct>("Product", ProductSchema);

export const ProductModel=ProductSchema;