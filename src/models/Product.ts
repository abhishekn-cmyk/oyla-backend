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
  mealType?: "veg" | "non-veg" | "vegan" | "breakfast" | "lunch" | "dinner" | "snack" | "soup" | "salad" | "biriyani" | "main-meal";
  availableDates: Date[];// Dates when this product is available
  category?: "main" | "breakfast" | "snack" | "salad" | "dessert" | "beverage"; // Admin can categorize
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
    features: { type: String },
    nutrition: {
      fat: { type: String },
      carbohydrate: { type: String },
      protein: { type: String },
      calories: { type: String },
    },
    ingredients: [{ type: String }],
    mealType: {
      type: String,
      enum: [
        "veg",
        "non-veg",
        "vegan",
        "breakfast",
        "lunch",
        "dinner",
        "snack",
        "soup",
        "salad",
        "biriyani",
        "main-meal"
      ],
    },
    availableDates: [{ type: Date }],   // For scheduling products per date
    category: {
      type: String,
      enum: ["main", "breakfast", "snack", "salad", "dessert", "beverage"],
    },
  },
  { timestamps: true }
);
ProductSchema.index({ name: "text", description: "text", mealType: 1, category: 1 });

export default model<IProduct>("Product", ProductSchema);

export const ProductModel=ProductSchema;