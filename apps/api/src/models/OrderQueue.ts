import mongoose, { Schema, Document, Types } from 'mongoose';
import type { QueueStatus } from '@hardstuck/shared';

export interface IOrderQueue extends Document {
  orderId: Types.ObjectId;
  gameId: Types.ObjectId;
  priority: number;
  position: number;
  estimatedWaitMinutes?: number;
  addedToQueueAt: Date;
  removedFromQueueAt?: Date;
  status: QueueStatus;
  assignedBoosterId?: Types.ObjectId;
}

const orderQueueSchema = new Schema<IOrderQueue>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
  priority: { type: Number, default: 0 },
  position: { type: Number, required: true },
  estimatedWaitMinutes: Number,
  addedToQueueAt: { type: Date, default: Date.now },
  removedFromQueueAt: Date,
  status: {
    type: String,
    enum: ['waiting', 'assigned', 'removed'],
    default: 'waiting',
  },
  assignedBoosterId: { type: Schema.Types.ObjectId, ref: 'Booster' },
});

orderQueueSchema.index({ gameId: 1, priority: -1, position: 1 });
orderQueueSchema.index({ status: 1 });

export const OrderQueue = mongoose.model<IOrderQueue>('OrderQueue', orderQueueSchema);
