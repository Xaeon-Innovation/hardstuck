import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRank extends Document {
  gameId: Types.ObjectId;
  name: string;
  division: number;
  difficultyMultiplier: number;
  rankOrder: number;
  createdAt: Date;
}

const rankSchema = new Schema<IRank>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    name: { type: String, required: true },
    division: { type: Number, default: 0 },
    difficultyMultiplier: { type: Number, required: true },
    rankOrder: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

rankSchema.index({ gameId: 1, rankOrder: 1 });

export const Rank = mongoose.model<IRank>('Rank', rankSchema);
