import { Schema, model, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  tagline?: string;
  taglines?:string[];
  description?: string;
  price: number; // selling price
  basePrice?: number; // base price for calculation
  costPrice?: number; // cost to buy/prepare
  image?: string;
  rating?: number;
  features?: string[];
  stock?: number;
  calories?: number | string;
  nutrition?: {
    fat?: string;
    carbohydrate?: string;
    protein?: string;
    calories?: string;
  };
  totalExpense?: number;
  availableDays?:string[];
  ingredients?: string[];
  mealType?: "veg" | "non-veg" | "vegan" | "breakfast" | "lunch" | "dinner" | "snack" | "soup" | "salad" | "biriyani" | "main-meal";
  availableDates?: Date[];
  category?: "main" | "breakfast" | "lunch" | "snack" | "salad" | "dessert" | "beverage" | "dinner"| "veg" | "non-veg" | "vegan" | "keto" | "diabetic" | "high-protein" |
       "diet" | "bodybuilding" | "yoga" | "wellness" | "vegan diet" | "healthy food" |
       "keto diet" | "intermittent fasting" | "weight loss" | "strength training" |
       "cardio" | "pilates" | "meditation";
 type?: "veg" | "non-veg" | "vegan" | "keto" | "diabetic" | "high-protein" |
       "diet" | "bodybuilding" | "yoga" | "wellness" | "vegan diet" | "healthy food" |
       "keto diet" | "intermittent fasting" | "weight loss" | "strength training" |
       "cardio" | "pilates" | "meditation";

  isActive?: boolean;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    tagline: { type: String },
   taglines: [{ type: String }],

    description: { type: String },
    price: { type: Number,default:0 }, // selling price
    basePrice: { type: Number, default: 0 }, // base price
    costPrice: { type: Number, default: 0 }, // purchase/prep cost
    image: { type: String },
    rating: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    features: [{ type: String }],
    calories: { type: Number },
    nutrition: {
      fat: { type: String },
      carbohydrate: { type: String },
      protein: { type: String },
      calories: { type: String }
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
      ]
    },
    type: {
      type: String,
      enum: ["veg", "non-veg", "vegan", "keto", "diabetic", "high-protein", "diet",
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
        "meditation",]
    },
    availableDates: [{ type: Date }],
    availableDays:{type:String},
    category: {
      type: String,
     enum: [
            "main", "breakfast", "lunch", "snack", "salad", "dessert", "beverage", "dinner",
            "veg", "non-veg", "vegan", "keto", "diabetic", "high-protein",
            "diet", "bodybuilding", "yoga", "wellness", "vegan diet", "healthy food",
            "keto diet", "intermittent fasting", "weight loss", "strength training",
            "cardio", "pilates", "meditation"
          ],

    },
    isActive: { type: Boolean, default: true },
    totalExpense: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ProductModel = model<IProduct>("Product", ProductSchema);
export default ProductModel;
