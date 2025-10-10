import { Schema, model, Document, Types } from "mongoose";

export interface IExpense extends Document {
  category: string;
  item:string;
  description?: string;
  amount: number;
  referenceNo?: string;
  attachments?: string[];
  quantity: Number,
  date: Date;
  createdBy: Types.ObjectId;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    category: { type: String, required: true },
    description: String,
    item:String,
    amount: { type: Number, required: true },
    referenceNo: String,
    attachments: [{ type: String }],
    quantity: {type:Number, default:0},
    date: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "SuperAdmin"},
  },
  { timestamps: true }
);

export const Expense = model<IExpense>("Expense", ExpenseSchema);
