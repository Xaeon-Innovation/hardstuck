import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBoosterGame extends Document {
  boosterId: Types.ObjectId;
  gameId: Types.ObjectId;
  gameHandle: string;
  currentRank: string;
  rankVerified: boolean;
  rankVerifiedAt?: Date;
  available: boolean;
  activeOrdersCount: number;
  totalCompletedOrders: number;
  createdAt: Date;
}

const boosterGameSchema = new Schema<IBoosterGame>(
  {
    boosterId: { type: Schema.Types.ObjectId, ref: 'Booster', required: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    gameHandle: { type: String, required: true },
    currentRank: { type: String, required: true },
    rankVerified: { type: Boolean, default: false },
    rankVerifiedAt: Date,
    available: { type: Boolean, default: true },
    activeOrdersCount: { type: Number, default: 0 },
    totalCompletedOrders: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

boosterGameSchema.index({ boosterId: 1, gameId: 1 });
boosterGameSchema.index({ available: 1 });

export const BoosterGame = mongoose.model<IBoosterGame>('BoosterGame', boosterGameSchema);
