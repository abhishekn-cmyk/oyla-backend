import { Schema, model, Document, Types } from "mongoose";

// ====================
// Carousel Interface
// ====================
export interface ICarousel extends Document {
  title?: string;            // Optional title for the slide
  subtitle?: string;         // Optional subtitle
  image: string;             // Image URL or path
  link?: string;             // Optional link when clicked
  isActive: boolean;         // Slide visibility
  order: number;             // Order in the carousel
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>; // Optional extra data
}

// ====================
// Carousel Schema
// ====================
const CarouselSchema = new Schema<ICarousel>(
  {
    title: { type: String },
    subtitle: { type: String },
    image: { type: String, required: true },
    link: { type: String },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Index to sort slides by order quickly
CarouselSchema.index({ order: 1 });
CarouselSchema.index({ isActive: 1 });

// ====================
// Model
// ====================
const Carousel = model<ICarousel>("Carousel", CarouselSchema);

export { Carousel };
