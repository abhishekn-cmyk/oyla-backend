import { Schema, model, Document, Types } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;
  type: "system" | "order" | "delivery" | "promotional" | "alert";
  priority?: "low" | "medium" | "high" | "urgent";
  targetAudience: "all" | "customers" | "delivery_partners" | "admins" | "specific_users";
  specificUsers?: Types.ObjectId[];
  scheduledFor?: Date;
  sentAt?: Date;
  status?: "draft" | "scheduled" | "sent" | "failed";
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  metadata?: {
    orderId?: Types.ObjectId;
    subscriptionId?: Types.ObjectId;
    deliveryId?: Types.ObjectId;
    deepLink?: string;
  };
  stats?: {
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
  };
  createdBy: string;
  createdAt:Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["system", "order", "delivery", "promotional", "alert","cart"],
      required: true
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },
    targetAudience: {
      type: String,
      enum: ["all", "customers", "delivery_partners", "admins", "specific_users","user"],
     
    },
    specificUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    scheduledFor: { type: Date },
    sentAt: { type: Date },
    createdAt:{type:Date},
    status: {
      type: String,
      enum: ["draft", "scheduled", "sent", "failed"],
      default: "draft"
    },
    channels: {
      push: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true }
    },
    metadata: {
      orderId: { type: Schema.Types.ObjectId, ref: "Order" },
      subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription" },
      deliveryId: { type: Schema.Types.ObjectId, ref: "Delivery" },
      deepLink: { type: String }
    },
    stats: {
  totalSent: { type: Number, default: 0 },
  delivered: { type: Number, default: 0 },
  opened: { type: Number, default: 0 },
  clicked: { type: Number, default: 0 }
},

    createdBy: { type: String, ref: "User" }
  },
  { timestamps: true }
);

export default model<INotification>("Notification", NotificationSchema);

