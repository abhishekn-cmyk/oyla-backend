import { Schema, model, Document, Types } from "mongoose";

// ---------------------- ENUMS ----------------------
export const SubscriptionStatus = [
  "active",
  "cancelled",
  "expired",
  "paused",
  "pending",
  "freeze",
  "delivered",
  "swappable",
  "completed",
  "resumed",
  "refunded"
] as const;

export type SubscriptionStatusType = typeof SubscriptionStatus[number];

// ---------------------- INTERFACE ----------------------
export interface ISubscription extends Document {
  userId: Types.ObjectId;
  planType: "basic" | "premium" | "pro";
  planName: string;
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatusType;
  autoRenew: boolean;
  price: number;
  currency: string;
  pauseCount:number;
  billingCycle: "monthly" | "quarterly" | "yearly" |"weekly" |"bi-weekly";
  mealsPerDay: number;
  totalMeals: number;
  consumedMeals: number;
  remainingMeals: number;
  durationDays: number;
   refundReason:string;
  isPaused?: boolean;
  isLocked?: boolean;
  isFrozen?: boolean;
  lastDeliveredAt?: Date;

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

  // meals calendar
  meals: {
    date: Date;
    breakfast?: Types.ObjectId;
    lunch?: Types.ObjectId;
    dinner?: Types.ObjectId;
    isLocked: boolean;
    status:string;
  }[];

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
    status: "pending" | "paid" | "failed" | "refunded"| "completed" |"active"|"inactive";
    amountPaid: number;
    currency: string;
    paymentDate?: Date;
     discountApplied: number,
     balanceRemaining:number
  };

  // discount / points / unique code
  discountCode?: string;
  discountAmount?: number;
  externalPoints?: number;
  uniqueCode?: string;
  
  createdAt: Date;
  updatedAt: Date;

  // ----- Methods -----
  consumeMeal(): Promise<ISubscription>;
  freeze(days: number, reason?: string): Promise<ISubscription>;
  swapMeal(date: Date, fromMeal: string, toMeal: string): Promise<ISubscription>;
}
 export const MealSchema = new Schema({
  date: { type: Date, required: true },
  breakfast: { type: Types.ObjectId, ref: "Product", default: null },
  lunch: { type: Types.ObjectId, ref: "Product", default: null },
  dinner: { type: Types.ObjectId, ref: "Product", default: null },
  isLocked: { type: Boolean, default: false },
  status:{type:String,default:"pending"},
});
// ---------------------- SCHEMA ----------------------
const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    planType: { type: String, enum: ["basic", "premium", "pro"], required: true },
    planName: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    durationDays: { type: Number },
    status: { type: String, enum: SubscriptionStatus, default: "active" },
    autoRenew: { type: Boolean, default: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    billingCycle: {
      type: String,
      enum: ["monthly", "quarterly", "yearly","weekly","bi-weekly"],
      
    },
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
    meals:[MealSchema],
    isPaused: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    isFrozen: { type: Boolean, default: false },
    refundReason:{type:String},
    // cancellation
    cancellationDate: Date,
    cancellationReason: String,
    cancellationStatus: { type: String, enum: ["pending", "processed", "refunded"] },
    refundAmount: { type: Number, default: 0 },
    penaltyAmount: { type: Number, default: 0 },
    completedDays: { type: Number, default: 0 },
    pendingDays: { type: Number, default: 0 },
    lastDeliveredAt: { type: Date },
   pauseCount:{type:Number},
    // meals calendar
   

    // delivery address
    deliveryAddress: {
      street: { type: String,  },
      city: { type: String, },
      state: { type: String },
      zipCode: { type: String, },
      country: { type: String, },
    },

   payment: {
  gateway: { type: String },
  transactionId: { type: String },
  status: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded","active","inactive","completed"],
    default: "pending",
  },
 balanceRemaining: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  currency: { type: String, default: "INR" },
  paymentDate: Date,
  discountApplied: { type: Number, default: 0 } // ✅ Add this line
},


    // discount / points / unique code
    discountCode: String,
    discountAmount: { type: Number, default: 0 },
    externalPoints: { type: Number, default: 0 },
    uniqueCode: String,
  },
  { timestamps: true }
);

// ---------------------- INDEXES ----------------------
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ startDate: 1, endDate: 1 });
SubscriptionSchema.index({ "meals.date": 1 });

// ---------------------- VIRTUALS ----------------------
SubscriptionSchema.virtual("isActive").get(function (this: ISubscription) {
  return (
    this.status === "active" &&
    !this.isPaused &&
    !this.isFrozen &&
    new Date() <= this.endDate
  );
});

SubscriptionSchema.virtual("progress").get(function (this: ISubscription) {
  return this.totalMeals > 0
    ? Math.round((this.consumedMeals / this.totalMeals) * 100)
    : 0;
});

// ---------------------- METHODS ----------------------
SubscriptionSchema.methods.consumeMeal = async function (this: ISubscription) {
  if (this.remainingMeals > 0) {
    this.consumedMeals += 1;
    this.remainingMeals -= 1;
    this.deliveredMeals += 1;
    this.pendingDeliveries = Math.max(this.remainingMeals - this.swappableMeals, 0);
  }
  return this.save();
};

SubscriptionSchema.methods.freeze = async function (
  this: ISubscription,
  days: number,
  reason?: string
) {
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + days);

  this.isFrozen = true;
  this.status = "freeze";
  this.frozenDays += days;
  this.freezeHistory.push({ startDate: start, endDate: end, reason });
  return this.save();
};

SubscriptionSchema.methods.swapMeal = async function (
  this: ISubscription,
  date: Date,
  fromMeal: string,
  toMeal: string
) {
  this.swapHistory.push({ date, fromMeal, toMeal });
  this.swappableMeals = Math.max(this.swappableMeals - 1, 0);
  return this.save();
};

// ---------------------- STATICS ----------------------
SubscriptionSchema.statics.findActiveByUser = function (userId: Types.ObjectId) {
  return this.findOne({
    userId,
    status: "active",
    endDate: { $gte: new Date() },
  });
};

// ---------------------- PRE-SAVE HOOK ----------------------
SubscriptionSchema.pre("save", function (next) {
  if (this.startDate && this.endDate) {
    const diff = this.endDate.getTime() - this.startDate.getTime();
    this.durationDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  this.remainingMeals = this.totalMeals - this.consumedMeals;
  this.pendingDeliveries = Math.max(this.remainingMeals - this.swappableMeals, 0);

  if (this.endDate && this.endDate < new Date()) {
    this.status = "expired";
  }

  if (this.remainingMeals <= 0 && this.status === "active") {
    this.status = "completed";
  }

  next();
});

// ---------------------- EXPORT ----------------------
const Subscription = model<ISubscription>("Subscription", SubscriptionSchema);
export default Subscription;
