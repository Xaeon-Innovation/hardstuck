import mongoose, { Schema, Document, Types } from 'mongoose';
import type { VerificationStatus, PayoutMethod } from '@hardstuck/shared';

export interface IBooster extends Document {
  userId: Types.ObjectId;
  bio?: string;
  totalEarningsLifetime: Types.Decimal128;
  monthlyEarnings: Types.Decimal128;
  currentMonth?: string;
  rating: number;
  reviewCount: number;
  completionRate: number;
  verificationStatus: VerificationStatus;
  verificationTier: number;
  verificationTier3Date?: Date;
  nextReVerificationDate?: Date;
  accountActivationStatus: boolean;
  plusMember: boolean;
  plusMemberUntil?: Date;
  payoutMethod?: PayoutMethod;
  payoutBankAccount?: {
    accountHolder?: string;
    iban?: string;
    swiftCode?: string;
  };
  isSuspended: boolean;
  suspensionReason?: string;
  suspensionDate?: Date;
  disputeCount: number;
  chargebackCount: number;
  fraudFlags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const boosterSchema = new Schema<IBooster>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bio: String,
    totalEarningsLifetime: { type: Schema.Types.Decimal128, default: '0' },
    monthlyEarnings: { type: Schema.Types.Decimal128, default: '0' },
    currentMonth: String,
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    completionRate: { type: Number, default: 100 },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified_tier1', 'verified_tier2', 'verified', 'suspended', 'rejected'],
      default: 'pending',
    },
    verificationTier: { type: Number, default: 0 },
    verificationTier3Date: Date,
    nextReVerificationDate: Date,
    accountActivationStatus: { type: Boolean, default: false },
    plusMember: { type: Boolean, default: false },
    plusMemberUntil: Date,
    payoutMethod: {
      type: String,
      enum: ['bank_transfer', 'card', 'paymob'],
    },
    payoutBankAccount: {
      accountHolder: String,
      iban: String,
      swiftCode: String,
    },
    isSuspended: { type: Boolean, default: false },
    suspensionReason: String,
    suspensionDate: Date,
    disputeCount: { type: Number, default: 0 },
    chargebackCount: { type: Number, default: 0 },
    fraudFlags: { type: [String], default: [] },
  },
  { timestamps: true }
);

boosterSchema.index({ verificationStatus: 1 });
boosterSchema.index({ rating: -1 });
boosterSchema.index({ completionRate: -1 });
boosterSchema.index({ createdAt: -1 });

export const Booster = mongoose.model<IBooster>('Booster', boosterSchema);
