import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGame extends Document {
  name: string;
  code: string;
  iconUrl?: string;
  basePrice: Types.Decimal128;
  apiProvider?: string;
  minAccountAge?: number;
  minRank?: string;
  active: boolean;
  createdAt: Date;
}

const gameSchema = new Schema<IGame>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    iconUrl: String,
    basePrice: { type: Schema.Types.Decimal128, required: true },
    apiProvider: String,
    minAccountAge: Number,
    minRank: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

gameSchema.index({ code: 1 });

export const Game = mongoose.model<IGame>('Game', gameSchema);
