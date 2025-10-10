import { Schema, model, Document, Types } from "mongoose";

export interface IUserNotification extends Document {
  userId: Types.ObjectId;
  notificationId: Types.ObjectId;
  status: "sent" | "delivered" | "read" | "clicked";
  readAt?: Date;
  clickedAt?: Date;
  channel: "push" | "email" | "sms" | "inApp";
}

const UserNotificationSchema = new Schema<IUserNotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notificationId: { type: Schema.Types.ObjectId, ref: "Notification", required: true },
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "clicked"],
      default: "sent"
    },
    readAt: { type: Date },
    clickedAt: { type: Date },
    channel: {
      type: String,
      enum: ["push", "email", "sms", "inApp"],
      required: true
    }
  },
  { timestamps: true }
);

export default model<IUserNotification>("UserNotification", UserNotificationSchema);