import { Schema, model, Document, Types } from "mongoose";

export interface IDelivery extends Document {
  orderId: Types.ObjectId;
  driverId?: Types.ObjectId; // delivery partner assigned
  deliveryPartnerId?: Types.ObjectId; // optional duplicate for clarity
  customerId: Types.ObjectId;
  restaurantId?: Types.ObjectId;
  deliveryAddress: string;
    deliveredProducts?: {
    productId: Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
  }[];
  deliveryStatus:
    | "pending"
    | "assigned"
    | "dispatched"
    | "picked_up"
    | "delivered"
    | "cancelled"
    | "failed";
    status:string;
  assignedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  otpCode?: string;
  distanceKm?: number;
  deliveryFee?: number;
  notes?: string;
}

const DeliverySchema = new Schema<IDelivery>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "DeliveryPartner" },
    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: "DeliveryPartner" }, // new field
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
    deliveryAddress: { type: String },
    deliveryStatus: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "dispatched",
        "picked_up", // new status
        "delivered",
        "cancelled",
        "failed",
      ],
      default: "pending",
    },
    assignedAt: { type: Date },
    pickedUpAt: { type: Date }, // new timestamp
    deliveredAt: { type: Date },
    otpCode: { type: String },
    distanceKm: { type: Number },
    status:{type:String},
    deliveryFee: { type: Number, default: 0 },
    notes: { type: String },
     deliveredProducts: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        name: String,
        quantity: Number,
        price: Number,
        costPrice:Number,
        status:String,
      }
    ],
  },
  { timestamps: true }
);

export default model<IDelivery>("Delivery", DeliverySchema);
