import mongoose, { Schema, Document, Types } from 'mongoose';
import type { NotificationType, SubscriptionStatus } from '@hardstuck/shared';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: Types.ObjectId;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'order_status',
        'message',
        'payout',
        'warning',
        'support',
        'promo',
        'verification',
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    relatedEntityType: String,
    relatedEntityId: Schema.Types.ObjectId,
    readAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ readAt: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export interface IUserNotificationPreferences extends Document {
  userId: Types.ObjectId;
  notifyEmailOrderStatus: boolean;
  notifyPushOrderStatus: boolean;
  notifyPushChat: boolean;
  notifyEmailChat: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  createdAt: Date;
  updatedAt: Date;
}

const prefsSchema = new Schema<IUserNotificationPreferences>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    notifyEmailOrderStatus: { type: Boolean, default: true },
    notifyPushOrderStatus: { type: Boolean, default: true },
    notifyPushChat: { type: Boolean, default: true },
    notifyEmailChat: { type: Boolean, default: false },
    quietHoursStart: { type: String, default: '21:00' },
    quietHoursEnd: { type: String, default: '09:00' },
  },
  { timestamps: true }
);

export const UserNotificationPreferences = mongoose.model<IUserNotificationPreferences>(
  'UserNotificationPreferences',
  prefsSchema
);

export interface ISubscription extends Document {
  userId: Types.ObjectId;
  type: 'plus_membership';
  status: SubscriptionStatus;
  paymobSubscriptionId?: string;
  currency: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['plus_membership'], default: 'plus_membership' },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'past_due'],
      default: 'active',
    },
    paymobSubscriptionId: { type: String, sparse: true, unique: true },
    currency: { type: String, default: 'USD' },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1, status: 1 });

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
