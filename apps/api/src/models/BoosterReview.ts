import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBoosterReview extends Document {
  boosterId: Types.ObjectId;
  clientId: Types.ObjectId;
  orderId: Types.ObjectId;
  rating: number;
  reviewText: string;
  verifiedPurchase: boolean;
  isFlagged: boolean;
  flagReason?: string;
  boosterResponse?: string;
  boosterResponseAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const boosterReviewSchema = new Schema<IBoosterReview>(
  {
    boosterId: { type: Schema.Types.ObjectId, ref: 'Booster', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    reviewText: { type: String, required: true },
    verifiedPurchase: { type: Boolean, default: true },
    isFlagged: { type: Boolean, default: false },
    flagReason: String,
    boosterResponse: String,
    boosterResponseAt: Date,
  },
  { timestamps: true }
);

boosterReviewSchema.index({ boosterId: 1, rating: -1, createdAt: -1 });
boosterReviewSchema.index({ verifiedPurchase: 1 });

export const BoosterReview = mongoose.model<IBoosterReview>(
  'BoosterReview',
  boosterReviewSchema
);
