import mongoose, { Schema, Document, Types } from 'mongoose';
import type { OrderStatus, PaymentStatus, CurrencyCode } from '@hardstuck/shared';

export interface IOrder extends Document {
  orderNumber: string;
  clientId: Types.ObjectId;
  boosterId?: Types.ObjectId;
  gameId: Types.ObjectId;
  serviceId: Types.ObjectId;
  startRankId: Types.ObjectId;
  endRankId: Types.ObjectId;
  startRankName: string;
  endRankName: string;
  basePrice: Types.Decimal128;
  serviceMultiplier: number;
  additionalFees: Types.Decimal128;
  totalPrice: Types.Decimal128;
  currency: CurrencyCode | string;
  platformCommission: Types.Decimal128;
  boosterEarnings: Types.Decimal128;
  status: OrderStatus;
  submittedAt?: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  estimatedCompletionAt?: Date;
  paymobIntentionId?: string;
  paymobTransactionId?: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  refundedAt?: Date;
  refundPercentage?: number;
  completionProof?: string;
  completionNotes?: string;
  clientConfirmed: boolean;
  clientConfirmedAt?: Date;
  disputeInitiatedAt?: Date;
  disputeReason?: string;
  disputeEvidence?: string;
  disputeResolution?: string;
  disputeResolvedAt?: Date;
  clientNotes?: string;
  boosterNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    boosterId: { type: Schema.Types.ObjectId, ref: 'Booster' },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    startRankId: { type: Schema.Types.ObjectId, ref: 'Rank', required: true },
    endRankId: { type: Schema.Types.ObjectId, ref: 'Rank', required: true },
    startRankName: { type: String, required: true },
    endRankName: { type: String, required: true },
    basePrice: { type: Schema.Types.Decimal128, required: true },
    serviceMultiplier: { type: Number, required: true },
    additionalFees: { type: Schema.Types.Decimal128, default: '0' },
    totalPrice: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, default: 'USD' },
    platformCommission: { type: Schema.Types.Decimal128, required: true },
    boosterEarnings: { type: Schema.Types.Decimal128, required: true },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'in_queue', 'in_progress', 'completed', 'cancelled', 'disputed'],
      default: 'draft',
    },
    submittedAt: Date,
    acceptedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    estimatedCompletionAt: Date,
    paymobIntentionId: String,
    paymobTransactionId: String,
    paymentStatus: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'refunded', 'disputed'],
      default: 'pending',
    },
    paymentMethod: String,
    refundedAt: Date,
    refundPercentage: Number,
    completionProof: String,
    completionNotes: String,
    clientConfirmed: { type: Boolean, default: false },
    clientConfirmedAt: Date,
    disputeInitiatedAt: Date,
    disputeReason: String,
    disputeEvidence: String,
    disputeResolution: String,
    disputeResolvedAt: Date,
    clientNotes: String,
    boosterNotes: String,
  },
  { timestamps: true }
);

orderSchema.index({ clientId: 1 });
orderSchema.index({ boosterId: 1 });
orderSchema.index({ gameId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ paymobTransactionId: 1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
