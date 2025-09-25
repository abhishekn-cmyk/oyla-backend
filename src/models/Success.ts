import { Schema, model, Document } from "mongoose";

export interface ISuccessStory extends Document {
  title: string;
  description: string;
  image?: string;          // single image
  images?: string[];       // optional multiple images
  author?: string;         // person / company name
  role?: string;           // role / designation
  category?: string;       // e.g., "Fitness", "Career"
  tags?: string[];
  date?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

const SuccessStorySchema = new Schema<ISuccessStory>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String },
    images: [{ type: String }],
    author: { type: String },
    role: { type: String },
    category: { type: String },
    tags: [{ type: String }],
    date: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default model<ISuccessStory>("SuccessStory", SuccessStorySchema);
