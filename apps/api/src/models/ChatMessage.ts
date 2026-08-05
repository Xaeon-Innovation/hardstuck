import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChatMessage extends Document {
  orderId: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  messageText: string;
  attachments: Array<{ type: 'image' | 'screenshot'; url: string; size: number }>;
  readAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    messageText: { type: String, required: true },
    attachments: [
      {
        type: { type: String, enum: ['image', 'screenshot'] },
        url: String,
        size: Number,
      },
    ],
    readAt: Date,
    deletedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

chatMessageSchema.index({ orderId: 1, createdAt: -1 });
chatMessageSchema.index({ senderId: 1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
