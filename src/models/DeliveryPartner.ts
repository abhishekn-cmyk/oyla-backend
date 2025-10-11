import { Schema, model, Document, Types } from "mongoose";

export interface IDeliveryPartner extends Document {
  adminId: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  password: string;
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  assignedZones: string[];
  isActive: boolean;
  currentStatus: "available" | "busy" | "offline";
  totalDeliveries: number;
  completedDeliveries: number;
   delayedDeliveries:number;
  rating: number;
  earnings: {
    total: number;
    pending: number;
    paid: number;
  };
  
  location?: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };
}

const DeliveryPartnerSchema = new Schema<IDeliveryPartner>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "SuperAdmin",  },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String },
    vehicleType: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    assignedZones: [{ type: String }],
    isActive: { type: Boolean, default: true },
    currentStatus: { type: String, enum: ["available", "busy", "offline"], default: "offline" },
    totalDeliveries: { type: Number, default: 0 },
    delayedDeliveries:{type:Number,default:0},
    completedDeliveries: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    earnings: {
      total: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      paid: { type: Number, default: 0 },
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      lastUpdated: { type: Date },
    },
  },
  { timestamps: true }
);

export default model<IDeliveryPartner>("DeliveryPartner", DeliveryPartnerSchema);
