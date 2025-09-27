"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletHistory = exports.Wallet = void 0;
const mongoose_1 = require("mongoose");
const WalletHistorySchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    walletId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    type: { type: String, enum: ['topup', 'payment', 'refund', 'withdrawal', 'order', 'recharge'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'KD' },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
    transactionId: { type: String },
    orderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Order' },
    paymentMethod: { type: String },
    status: { type: String, enum: ['completed', 'pending', 'failed', 'cancelled'], default: 'completed' },
    transactionDate: { type: Date, default: Date.now },
    metadata: { type: mongoose_1.Schema.Types.Mixed }
}, { timestamps: true });
WalletHistorySchema.index({ userId: 1, transactionDate: -1 });
WalletHistorySchema.index({ walletId: 1, type: 1 });
WalletHistorySchema.index({ transactionDate: -1 });
const WalletSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'KD' },
    isActive: { type: Boolean, default: true },
    lastTransactionDate: { type: Date },
    totalTopups: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
}, { timestamps: true });
// Virtual field (not stored in DB)
WalletSchema.virtual('formattedBalance').get(function () {
    return `${this.currency}${this.balance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
});
// Pre-save middleware to update lastTransactionDate
WalletSchema.pre('save', function (next) {
    if (this.isModified('balance')) {
        this.lastTransactionDate = new Date();
    }
    next();
});
// Static method: get wallet + recent transactions
WalletSchema.statics.getWalletWithHistory = function (userId, limit = 10) {
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
const WalletHistory = (0, mongoose_1.model)("WalletHistory", WalletHistorySchema);
exports.WalletHistory = WalletHistory;
const Wallet = (0, mongoose_1.model)("Wallet", WalletSchema);
exports.Wallet = Wallet;
