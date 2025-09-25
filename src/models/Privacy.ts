import { Schema, model, Document } from "mongoose";

export interface IPrivacyPolicy extends Document {
  title: string;          // e.g., "Privacy Policy"
  content: string;        // full HTML/text content
  version?: string;       // optional version number, e.g., "1.0"
  effectiveDate?: Date;   // when this version became effective
  isActive?: boolean;     // mark the current active policy
}

const PrivacyPolicySchema = new Schema<IPrivacyPolicy>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    version: { type: String },
    effectiveDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model<IPrivacyPolicy>("PrivacyPolicy", PrivacyPolicySchema);
