import { Schema, model, Document, Types } from "mongoose";

export interface IUser extends Document {
  email: string;
  password?: string; // optional for social login
  googleId?: string;
  facebookId?: string;
  otpCode?: string;
  isVerified: boolean;
  username: string;
  stripePaymentMethodId:string;
  stripeCustomerId:string;
  role: "user" | "admin" | "superadmin" | "delivery_partner";
  wallet?:Types.ObjectId[];
  profile: {
    firstName: string;
    lastName: string;
    dob?: Date;
    gender?: "male" | "female" | "other";
    address?: string;
    mobileNumber?: string;
    profileImage?: string;
    selectedPrograms?: Types.ObjectId[];
  };
  preferences?: {
    mealTypes?: string[];
    dietaryRestrictions?: string[];
    deliveryInstructions?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    facebookId: { type: String },
    otpCode: { type: String },
    username: { type: String, required: true },
    role: { 
      type: String, 
      enum: ["user", "admin", "superadmin", "delivery_partner"], 
      default: "user" 
    },
    wallet:{type:Schema.Types.ObjectId,ref:"Wallet"},
    isVerified: { type: Boolean, default: false },
    profile: {
      firstName: { type: String },
      lastName: { type: String },
      dob: { type: Date },
      gender: { type: String, enum: ["male", "female", "other"] },
      address: { type: String },
      mobileNumber: { type: String },
      profileImage: { type: String },
      selectedPrograms: [{ type: Schema.Types.ObjectId, ref: "Program" }]
    },
    stripeCustomerId:{type:String},
    stripePaymentMethodId:{type:String},
    preferences: {
      mealTypes: [{ type: String }],
      dietaryRestrictions: [{ type: String }],
      deliveryInstructions: { type: String }
    }
  },
  { timestamps: true }
);

export default model<IUser>("User", UserSchema);
