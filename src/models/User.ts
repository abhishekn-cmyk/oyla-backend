import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  _id:string;
  email: string;
  password?: string; // optional for social login
  googleId?: string;
  facebookId?: string;
  otpCode?: string;
  isVerified: boolean;
  username:string;
  role:string;
  profile: {
    firstName: string;
    lastName: string;
    dob?: Date;
    gender?: "male" | "female" | "other";
    address?: string;
    mobileNumber?: string;
    profileImage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    username: { type: String },
    facebookId: { type: String },
    otpCode: { type: String },
    role: { type: String, enum: ["user"], default: "user" },
    isVerified: { type: Boolean, default: false },
    profile: {
      firstName: { type: String },
      lastName: { type: String },
      dob: { type: Date },
      gender: { type: String, enum: ["male", "female", "other"] },
      address: { type: String },
      mobileNumber: { type: String },
      profileImage: { type: String },
      selectedPrograms: [{ type: String, ref: "Program" }],
    },
  },
  { timestamps: true }
);


export default model("User", UserSchema); // Remove <IUser>
