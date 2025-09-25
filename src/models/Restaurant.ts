import { Schema, model, Document } from "mongoose";
import { IProduct, ProductModel } from "./Product";

export interface IRestaurant extends Document {
  name: string;
  description?: string;
  image?: string;
  features?: string[];         // e.g., "Free WiFi", "Outdoor Seating"
  rating?: number;             // overall restaurant rating
  address?: string;            // restaurant address
  location?: {                 // geolocation
    lat: number;
    lng: number;
  };
  menu: IProduct[];            // all menu items
  popularMenu: IProduct[];     // subset of popular dishes
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
    menu: [ProductModel],        // nested products/dishes
    popularMenu: [ProductModel], // popular dishes
  },
  { timestamps: true }
);

export default model<IRestaurant>("Restaurant", RestaurantSchema);
