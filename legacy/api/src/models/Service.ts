import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IService extends Document {
  gameId: Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  priceMultiplier: number;
  requiresDuo: boolean;
  createdAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    description: String,
    priceMultiplier: { type: Number, required: true },
    requiresDuo: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

serviceSchema.index({ gameId: 1, code: 1 }, { unique: true });

export const Service = mongoose.model<IService>('Service', serviceSchema);
