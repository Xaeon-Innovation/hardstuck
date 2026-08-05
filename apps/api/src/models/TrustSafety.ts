import mongoose, { Schema, Document, Types } from 'mongoose';
import type { FraudFlagType, FraudSeverity } from '@hardstuck/shared';

export interface IBoosterVerificationDocument extends Document {
  boosterId: Types.ObjectId;
  verificationTier: number;
  documentType: 'id_document' | 'selfie' | 'rank_screenshot' | 'account_proof';
  documentUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  verifiedByAdminId?: Types.ObjectId;
  verifiedAt?: Date;
  createdAt: Date;
}

const verificationDocSchema = new Schema<IBoosterVerificationDocument>(
  {
    boosterId: { type: Schema.Types.ObjectId, ref: 'Booster', required: true },
    verificationTier: { type: Number, required: true },
    documentType: {
      type: String,
      enum: ['id_document', 'selfie', 'rank_screenshot', 'account_proof'],
      required: true,
    },
    documentUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: String,
    verifiedByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

verificationDocSchema.index({ boosterId: 1, verificationTier: 1, status: 1 });
verificationDocSchema.index({ createdAt: -1 });

export const BoosterVerificationDocument = mongoose.model<IBoosterVerificationDocument>(
  'BoosterVerificationDocument',
  verificationDocSchema
);

export interface IFraudFlag extends Document {
  userId: Types.ObjectId;
  userType: 'booster' | 'client';
  flagType: FraudFlagType;
  severity: FraudSeverity;
  description: string;
  evidence?: string;
  resolved: boolean;
  resolvedAt?: Date;
  action?: 'warned' | 'suspended' | 'investigated';
  createdAt: Date;
}

const fraudFlagSchema = new Schema<IFraudFlag>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userType: { type: String, enum: ['booster', 'client'], required: true },
    flagType: {
      type: String,
      enum: [
        'chargeback',
        'multiple_disputes',
        'unusual_activity',
        'account_verification_failed',
        'vpn_detected',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },
    description: { type: String, required: true },
    evidence: String,
    resolved: { type: Boolean, default: false },
    resolvedAt: Date,
    action: { type: String, enum: ['warned', 'suspended', 'investigated'] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

fraudFlagSchema.index({ userId: 1, flagType: 1, severity: 1, resolved: 1, createdAt: -1 });

export const FraudFlag = mongoose.model<IFraudFlag>('FraudFlag', fraudFlagSchema);

export interface IAdminActivityLog extends Document {
  adminId: Types.ObjectId;
  action: string;
  targetType: string;
  targetId: Types.ObjectId;
  details?: Record<string, unknown>;
  reason?: string;
  createdAt: Date;
}

const adminActivityLogSchema = new Schema<IAdminActivityLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    details: Schema.Types.Mixed,
    reason: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

adminActivityLogSchema.index({ adminId: 1, action: 1, createdAt: -1, targetId: 1 });

export const AdminActivityLog = mongoose.model<IAdminActivityLog>(
  'AdminActivityLog',
  adminActivityLogSchema
);

export interface IDailyAnalytics extends Document {
  date: Date;
  totalOrdersCount: number;
  totalRevenue: Types.Decimal128;
  totalPayouts: Types.Decimal128;
  activeBoosters: number;
  activeClients: number;
  newBoosters: number;
  newClients: number;
  completionRate: number;
  avgCompletionTimeMinutes: number;
  avgOrderValue: Types.Decimal128;
  chargebackCount: number;
  disputeCount: number;
  createdAt: Date;
}

const dailyAnalyticsSchema = new Schema<IDailyAnalytics>(
  {
    date: { type: Date, required: true, unique: true },
    totalOrdersCount: { type: Number, default: 0 },
    totalRevenue: { type: Schema.Types.Decimal128, default: '0' },
    totalPayouts: { type: Schema.Types.Decimal128, default: '0' },
    activeBoosters: { type: Number, default: 0 },
    activeClients: { type: Number, default: 0 },
    newBoosters: { type: Number, default: 0 },
    newClients: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    avgCompletionTimeMinutes: { type: Number, default: 0 },
    avgOrderValue: { type: Schema.Types.Decimal128, default: '0' },
    chargebackCount: { type: Number, default: 0 },
    disputeCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

dailyAnalyticsSchema.index({ date: -1 });

export const DailyAnalytics = mongoose.model<IDailyAnalytics>(
  'DailyAnalytics',
  dailyAnalyticsSchema
);
