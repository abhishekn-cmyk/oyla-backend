import mongoose, { Schema, Document, InferSchemaType } from "mongoose";
import bcrypt from "bcryptjs";

const superAdminSchema = new Schema(
  {
    username: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    mobileNumber: { type: String },
    role: { type: String, enum: ["superadmin"], default: "superadmin" },
    profileImage: { type: String },
  },
  { timestamps: true }
);

// 🔑 Infer TypeScript type from schema
export type ISuperAdmin = InferSchemaType<typeof superAdminSchema> &
  Document & {
    _id: mongoose.Types.ObjectId;
    comparePassword(candidatePassword: string): Promise<boolean>;
  };

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

// ✅ Cast through unknown to avoid TS complaints
const SuperAdmin = mongoose.model("SuperAdmin", superAdminSchema) as unknown as mongoose.Model<ISuperAdmin>;
export default SuperAdmin;
