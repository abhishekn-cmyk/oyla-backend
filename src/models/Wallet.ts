import { Schema, model, Document, Types, Model } from "mongoose";

// ====================
// Wallet History Schema
// ====================
export interface IWalletHistory extends Document {
  userId: Types.ObjectId;
  walletId: Types.ObjectId;
  type: 'topup' | 'payment' | 'refund' | 'withdrawal' | 'order' | 'recharge';
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  transactionId?: string;
  orderId?: Types.ObjectId;
  paymentMethod?: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  transactionDate: Date;
  metadata?: Record<string, any>;
}

const WalletHistorySchema = new Schema<IWalletHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
    type: { type: String, enum: ['topup', 'payment', 'refund', 'withdrawal', 'order', 'recharge'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'KD' },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
    transactionId: { type: String },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    paymentMethod: { type: String },
    status: { type: String, enum: ['completed', 'pending', 'failed', 'cancelled'], default: 'completed' },
    transactionDate: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

WalletHistorySchema.index({ userId: 1, transactionDate: -1 });
WalletHistorySchema.index({ walletId: 1, type: 1 });
WalletHistorySchema.index({ transactionDate: -1 });

// ====================
// Wallet Schema
// ====================
export interface IWallet extends Document {
  userId: Types.ObjectId;
  balance: number;
  currency: string;
  isActive: boolean;
  lastTransactionDate?: Date;
  totalTopups: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;

  // virtual
  formattedBalance: string;
}

// Wallet Model with statics
export interface IWalletModel extends Model<IWallet> {
  getWalletWithHistory(userId: Types.ObjectId, limit?: number): Promise<any>;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'KD' },
    isActive: { type: Boolean, default: true },
    lastTransactionDate: { type: Date },
    totalTopups: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Virtual field (not stored in DB)
WalletSchema.virtual('formattedBalance').get(function(this: IWallet) {
  return `${this.currency}${this.balance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
});

// Pre-save middleware to update lastTransactionDate
WalletSchema.pre('save', function(next) {
  if (this.isModified('balance')) {
    this.lastTransactionDate = new Date();
  }
  next();
});

// Static method: get wallet + recent transactions
WalletSchema.statics.getWalletWithHistory = function(userId: Types.ObjectId, limit: number = 10) {
  return this.aggregate([
    { $match: { userId } },
    {
      $lookup: {
        from: 'wallethistories',
        let: { walletId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$walletId', '$$walletId'] } } },
          { $sort: { transactionDate: -1 } },
          { $limit: limit },
          {
            $project: {
              type: 1,
              amount: 1,
              description: 1,
              balanceBefore: 1,
              balanceAfter: 1,
              transactionDate: 1,
              status: 1
            }
          }
        ],
        as: 'recentTransactions'
      }
    }
  ]);
};

WalletSchema.index({ userId: 1 });
WalletSchema.index({ balance: 1 });

const WalletHistory = model<IWalletHistory>("WalletHistory", WalletHistorySchema);
const Wallet = model<IWallet, IWalletModel>("Wallet", WalletSchema);

export { Wallet, WalletHistory };
