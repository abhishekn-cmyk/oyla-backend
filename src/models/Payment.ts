import { Schema, model, Document, Types } from "mongoose";

export interface IPayment extends Document {
  userId: Types.ObjectId;
  subscriptionId: Types.ObjectId;
  orderId:string;
  amount: number;
  currency: string;
  gateway: string; // e.g., wallet, razorpay, stripe
  status: "pending" | "completed" | "failed"|"refunded" |"active" | "inactive";
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription"},
     orderId: { type: String, ref: "Order"},
    amount: { type: Number, required: true },
    currency: { type: String, default: "KWD" },
    gateway: { type: String },
    status: { type: String, enum: ["pending", "completed", "failed","refunded","active","inactive"], default: "pending" },
    transactionId: { type: String },
  },
  { timestamps: true }
);

export default model<IPayment>("Payment", PaymentSchema);
