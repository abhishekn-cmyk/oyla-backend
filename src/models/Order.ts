import { Schema, model, Document, Types } from "mongoose";
import { IProduct } from "./Product";

export interface IOrderItem {
  product: Types.ObjectId | IProduct;
  quantity: number;
  price: number; // snapshot price at checkout
  restaurant?: Types.ObjectId; // optional
  program?: Types.ObjectId;    // optional
}

export interface IOrder extends Document {
  userId: Types.ObjectId;
  items: IOrderItem[];
  totalPrice: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  paymentMethod: "card" | "upi" | "cod" | "wallet";
  shippingAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant" },
        program: { type: Schema.Types.ObjectId, ref: "Program" },
      },
    ],
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "cod", "wallet"],
      required: true,
    },
    shippingAddress: { type: String },
  },
  { timestamps: true }
);

export default model<IOrder>("Order", OrderSchema);
