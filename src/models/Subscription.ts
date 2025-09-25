import { Schema, model, Document, Types } from "mongoose";

export interface ISubscription extends Document {
  userId: Types.ObjectId;
  planType: "basic" | "premium" | "pro";
  planName: string;
  startDate: Date;
  endDate: Date;
  status: "active" | "cancelled" | "expired" | "paused" | "pending" | "freeze" | "delivered" | "swappable";
  autoRenew: boolean;
  price: number;
  currency: string;
  billingCycle: "monthly" | "quarterly" | "yearly";
  mealsPerDay: number;
  totalMeals: number;
  consumedMeals: number;
  remainingMeals: number;
  durationDays: number;

  // delivery
  deliveredMeals: number;
  pendingDeliveries: number;

  // frozen
  frozenDays: number;
  freezeHistory: { startDate: Date; endDate: Date; reason?: string }[];

  // swappable
  swappableMeals: number;
  swapHistory: { date: Date; fromMeal: string; toMeal: string }[];

  // cancellation
  cancellationDate?: Date;
  cancellationReason?: string;
  cancellationStatus?: "pending" | "processed" | "refunded";
  refundAmount?: number;
  
  penaltyAmount?: number;
  completedDays?: number;
  pendingDays?: number;

  // delivery address
  deliveryAddress: {
    street: string;
    city: string;
    state?: string;
    zipCode: string;
    country: string;
  };

  // payment
  payment: {
    gateway: string;
    transactionId?: string;
    status: "pending" | "paid" | "failed" | "refunded";
    amountPaid: number;
    currency: string;
    paymentDate?: Date;
  };

  discountCode?: string;
  discountAmount?: number;
  externalPoints?: number;
  uniqueCode?: string;

  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    planType: { type: String, enum: ["basic", "premium", "pro"], required: true },
    planName: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    durationDays: { type: Number },

    status: {
      type: String,
      enum: ["active", "cancelled", "expired", "paused", "pending", "freeze", "delivered", "swappable"],
      default: "active",
    },
    autoRenew: { type: Boolean, default: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    billingCycle: { type: String, enum: ["monthly", "quarterly", "yearly"], required: true },
    mealsPerDay: { type: Number, default: 3 },
    totalMeals: { type: Number, required: true },
    consumedMeals: { type: Number, default: 0 },
    remainingMeals: { type: Number, default: 0 },

    // delivery
    deliveredMeals: { type: Number, default: 0 },
    pendingDeliveries: { type: Number, default: 0 },

    // frozen
    frozenDays: { type: Number, default: 0 },
    freezeHistory: [{ startDate: Date, endDate: Date, reason: String }],

    // swappable
    swappableMeals: { type: Number, default: 0 },
    swapHistory: [{ date: Date, fromMeal: String, toMeal: String }],

    // cancellation
    cancellationDate: Date,
    cancellationReason: String,
    cancellationStatus: { type: String, enum: ["pending", "processed", "refunded"] },
    refundAmount: { type: Number, default: 0 },
    penaltyAmount: { type: Number, default: 0 },
    completedDays: { type: Number, default: 0 },
    pendingDays: { type: Number, default: 0 },

    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: String,
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
    },

    payment: {
      gateway: { type: String, required: true },
      transactionId: String,
      status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
      amountPaid: { type: Number, default: 0 },
      currency: { type: String, default: "INR" },
      paymentDate: Date,
    },

    discountCode: String,
    discountAmount: { type: Number, default: 0 },
    externalPoints: { type: Number, default: 0 },
    uniqueCode: String,
  },
  { timestamps: true }
);

// auto calc
SubscriptionSchema.pre("save", function (next) {
  if (this.startDate && this.endDate) {
    const diff = this.endDate.getTime() - this.startDate.getTime();
    this.durationDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  this.remainingMeals = this.totalMeals - this.consumedMeals;
  this.pendingDeliveries = Math.max(this.remainingMeals - this.swappableMeals, 0);

  if (this.endDate && this.endDate < new Date() && this.status === "active") {
    this.status = "expired";
  }
  next();
});

const Subscription = model<ISubscription>("Subscription", SubscriptionSchema);
export default Subscription;
