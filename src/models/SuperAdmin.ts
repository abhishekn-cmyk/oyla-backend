import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface ISuperAdmin extends Document {
  username: string;
  email: string;
  password: string;
  mobileNumber: string;
  role: "superadmin";
  profileImage?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const superAdminSchema = new Schema<ISuperAdmin>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    role: { type: String, enum: ["superadmin"], default: "superadmin" },
    profileImage: { type: String },
  },
  { timestamps: true }
);

// Hash password before saving
superAdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
superAdminSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return bcrypt.compare(candidatePassword, this.password);
};

const SuperAdmin = mongoose.model<ISuperAdmin>("SuperAdmin", superAdminSchema);
export default SuperAdmin;
