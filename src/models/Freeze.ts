import { Schema, model, Document, Types } from "mongoose";

export interface IFreeze extends Document {
  userId: Types.ObjectId;          // User who froze the product
  productId: Types.ObjectId;       // Product being frozen
  freezeDate: Date;                // The date being frozen
  selectedDate: Date;              // When freeze was created
  meals: {                         // Meals affected by freeze
    breakfast?: boolean;
    lunch?: boolean;
    dinner?: boolean;
  };
  status: 'active' | 'inactive' | 'cancelled'; // Freeze status
  deliveryStatus?: string;         // Optional delivery info
  totalMealsConsumption?: number;  // Optional tracking
  subscriptionMealsConsumption?: number; 
  createdAt: Date;
  updatedAt: Date;
}

const FreezeSchema = new Schema<IFreeze>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User'},
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    freezeDate: { type: Date, required: true },
    selectedDate: { type: Date, default: Date.now },
    meals: {
      breakfast: { type: Boolean, default: false },
      lunch: { type: Boolean, default: false },
      dinner: { type: Boolean, default: false },
    },
    status: { type: String, enum: ['active','inactive','cancelled'], default: 'active' },
    deliveryStatus: { type: String },
    totalMealsConsumption: { type: Number, default: 0 },
    subscriptionMealsConsumption: { type: Number, default: 0 }
  },
  { timestamps: true }
);


const Freeze = model<IFreeze>('Freeze', FreezeSchema);
export default Freeze;
