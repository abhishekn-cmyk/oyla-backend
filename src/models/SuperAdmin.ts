import { Schema, model, Document } from "mongoose";

export interface ISuperAdmin extends Document {
  email: string;
  password: string;
  name: string;
  role: "superadmin";
  permissions: string[];
  phoneNumber: string;
  lastLogin?: Date;
  isActive: boolean;
  profileImage: string;

  // New fields
  terms?: string;
  privacyPolicy?: string;
  renewalRules?: string;
}

const SuperAdminSchema = new Schema<ISuperAdmin>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    profileImage: { type: String },
    phoneNumber: { type: String },
    role: { type: String, enum: ["superadmin"], default: "superadmin" },
    permissions: [{ type: String }],
    lastLogin: { type: Date },
    isActive: { type: Boolean, default: true },

    // Policies fields
    terms: { type: String, default: "" },
    privacyPolicy: { type: String, default: "" },
    renewalRules: { type: String, default: "" },
  },
  { timestamps: true }
);

export default model<ISuperAdmin>("SuperAdmin", SuperAdminSchema);
