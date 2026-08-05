import mongoose, { Schema, Document, Types } from 'mongoose';
import type { IssueType, TicketPriority, TicketStatus } from '@hardstuck/shared';

export interface ISupportTicket extends Document {
  ticketNumber: string;
  clientId: Types.ObjectId;
  orderId?: Types.ObjectId;
  subject: string;
  description: string;
  issueType: IssueType;
  priority: TicketPriority;
  status: TicketStatus;
  assignedToModId?: Types.ObjectId;
  attachments: Array<{ url: string; size: number }>;
  resolutionNotes?: string;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    issueType: {
      type: String,
      enum: ['account_access', 'refund_request', 'quality_dispute', 'technical_issue', 'other'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    assignedToModId: { type: Schema.Types.ObjectId, ref: 'User' },
    attachments: [{ url: String, size: Number }],
    resolutionNotes: String,
    firstResponseAt: Date,
    resolvedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

supportTicketSchema.index({ clientId: 1 });
supportTicketSchema.index({ status: 1, priority: -1, createdAt: -1 });
supportTicketSchema.index({ assignedToModId: 1 });

export const SupportTicket = mongoose.model<ISupportTicket>(
  'SupportTicket',
  supportTicketSchema
);

export interface ISupportTicketReply extends Document {
  ticketId: Types.ObjectId;
  repliedBy: Types.ObjectId;
  replyText: string;
  attachments: Array<{ url: string; size: number }>;
  isInternal: boolean;
  createdAt: Date;
}

const replySchema = new Schema<ISupportTicketReply>(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
    repliedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    replyText: { type: String, required: true },
    attachments: [{ url: String, size: Number }],
    isInternal: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

replySchema.index({ ticketId: 1, createdAt: 1 });

export const SupportTicketReply = mongoose.model<ISupportTicketReply>(
  'SupportTicketReply',
  replySchema
);
