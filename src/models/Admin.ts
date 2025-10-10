import { Schema, model, Document, Types } from "mongoose";

export interface IAdmin extends Document {
  superAdminId: Types.ObjectId;
  email: string;
  password: string;
  name: string;
  role: "admin";
  permissions: {
    customerManagement: boolean;
    subscriptionManagement: boolean;
    mealManagement: boolean;
    deliveryManagement: boolean;
    reportAccess: boolean;
    notificationAccess: boolean;
    refundAccess: boolean;
  };
  assignedZones: string[]; // Delivery zones/pincodes
  isActive: boolean;
  lastLogin?: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    superAdminId: { type: Schema.Types.ObjectId, ref: "SuperAdmin", required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin"], default: "admin" },
    permissions: {
      customerManagement: { type: Boolean, default: false },
      subscriptionManagement: { type: Boolean, default: false },
      mealManagement: { type: Boolean, default: false },
      deliveryManagement: { type: Boolean, default: false },
      reportAccess: { type: Boolean, default: false },
      notificationAccess: { type: Boolean, default: false },
      refundAccess: { type: Boolean, default: false }
    },
    assignedZones: [{ type: String }],
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date }
  },
  { timestamps: true }
);

export default model<IAdmin>("Admin", AdminSchema);