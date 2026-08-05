import mongoose, { Schema, Document, Types } from 'mongoose';
import type { TransactionStatus, PayoutStatus, CurrencyCode } from '@hardstuck/shared';

export interface IPaymentTransaction extends Document {
  orderId: Types.ObjectId;
  paymobIntentionId?: string;
  paymobTransactionId?: string;
  amount: Types.Decimal128;
  currency: CurrencyCode | string;
  status: TransactionStatus;
  paymentMethod?: string;
  rawWebhook?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    paymobIntentionId: String,
    paymobTransactionId: { type: String, sparse: true, unique: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['succeeded', 'failed', 'pending'],
      default: 'pending',
    },
    paymentMethod: String,
    rawWebhook: Schema.Types.Mixed,
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ orderId: 1 });
paymentTransactionSchema.index({ status: 1 });

export const PaymentTransaction = mongoose.model<IPaymentTransaction>(
  'PaymentTransaction',
  paymentTransactionSchema
);

export interface IPayoutTransaction extends Document {
  boosterId: Types.ObjectId;
  paymobPayoutId?: string;
  amount: Types.Decimal128;
  currency: CurrencyCode | string;
  status: PayoutStatus;
  holdUntil?: Date;
  paidAt?: Date;
  payoutCycle?: string;
  deductions: Array<{ reason: string; amount: Types.Decimal128 }>;
  createdAt: Date;
}

const payoutTransactionSchema = new Schema<IPayoutTransaction>(
  {
    boosterId: { type: Schema.Types.ObjectId, ref: 'Booster', required: true },
    paymobPayoutId: { type: String, sparse: true, unique: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled'],
      default: 'pending',
    },
    holdUntil: Date,
    paidAt: Date,
    payoutCycle: String,
    deductions: [
      {
        reason: String,
        amount: Schema.Types.Decimal128,
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

payoutTransactionSchema.index({ boosterId: 1, status: 1, createdAt: -1 });

export const PayoutTransaction = mongoose.model<IPayoutTransaction>(
  'PayoutTransaction',
  payoutTransactionSchema
);
