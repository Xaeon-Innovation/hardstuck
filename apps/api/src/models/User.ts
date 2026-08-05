import mongoose, { Schema, Document, Types } from 'mongoose';
import type { UserRole } from '@hardstuck/shared';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  phone?: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  emailVerifyToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  twoFaEnabled: boolean;
  twoFaSecret?: string;
  role: UserRole;
  lastLogin?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: String,
    phone: String,
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    twoFaEnabled: { type: Boolean, default: false },
    twoFaSecret: String,
    role: {
      type: String,
      enum: ['client', 'booster', 'mod', 'admin'],
      default: 'client',
    },
    lastLogin: Date,
    deletedAt: Date,
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUser>('User', userSchema);
