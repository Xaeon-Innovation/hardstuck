import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPricingConfig extends Document {
  gameId: Types.ObjectId;
  rankId?: Types.ObjectId;
  serviceId?: Types.ObjectId;
  baseMultiplier: number;
  adjustments: {
    queueWaitBonus: number;
    lowRatingPenalty: number;
    newBoosterDiscount: number;
    peakHourBonus: number;
  };
  lastModifiedBy?: Types.ObjectId;
  lastModifiedAt?: Date;
  createdAt: Date;
}

const pricingConfigSchema = new Schema<IPricingConfig>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    rankId: { type: Schema.Types.ObjectId, ref: 'Rank' },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
    baseMultiplier: { type: Number, default: 1 },
    adjustments: {
      queueWaitBonus: { type: Number, default: 0.1 },
      lowRatingPenalty: { type: Number, default: 0.15 },
      newBoosterDiscount: { type: Number, default: 0.2 },
      peakHourBonus: { type: Number, default: 0.1 },
    },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

pricingConfigSchema.index({ gameId: 1, rankId: 1, serviceId: 1 });

export const PricingConfig = mongoose.model<IPricingConfig>(
  'PricingConfig',
  pricingConfigSchema
);
