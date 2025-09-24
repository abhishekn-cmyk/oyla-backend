import { Schema, model, Document } from "mongoose";

// Interface for TypeScript
export interface ILanguage extends Document {
  name: string;          // e.g., "English"
  proficiency?: string;  // e.g., "Beginner", "Intermediate", "Fluent"
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const LanguageSchema = new Schema<ILanguage>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    proficiency: {
      type: String,
      enum: ["Beginner", "Intermediate", "Fluent", "Native"],
      default: "Beginner",
    },
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt
  }
);

// Model
const Language = model<ILanguage>("Language", LanguageSchema);

export default Language;
