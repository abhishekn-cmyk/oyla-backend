import { Schema, model, Document, Types } from "mongoose";

export interface IRestaurant extends Document {
  name: string;
  description?: string;
  image?: string;
  features?: string[];
  rating?: number;
  address?: string;
  location?: { lat: number; lng: number };
  menu: Types.ObjectId[];        // references to Product
  popularMenu: Types.ObjectId[]; // references to Product
}

const RestaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    features: [{ type: String }],
    rating: { type: Number, default: 0 },
    address: { type: String },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    menu: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    popularMenu: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

export default model<IRestaurant>("Restaurant", RestaurantSchema);
