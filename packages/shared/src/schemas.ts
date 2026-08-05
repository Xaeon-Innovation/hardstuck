import { z } from 'zod';
import {
  SupportedCurrencies,
  UserRoles,
  OrderStatuses,
  DEFAULT_CURRENCY,
} from './enums';

export const registerSchema = z.object({
  username: z.string().min(3).max(32),
  email: z.string().email(),
  password: z
    .string()
    .min(12)
    .regex(/[a-z]/, 'Must include lowercase')
    .regex(/[A-Z]/, 'Must include uppercase')
    .regex(/[0-9]/, 'Must include a number')
    .regex(/[^A-Za-z0-9]/, 'Must include a symbol'),
  role: z.enum(['client', 'booster']).default('client'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const priceQuoteSchema = z.object({
  gameId: z.string().min(1),
  serviceId: z.string().min(1),
  startRankId: z.string().min(1),
  endRankId: z.string().min(1),
  currency: z.enum(SupportedCurrencies).default(DEFAULT_CURRENCY),
  queueWaitDays: z.number().min(0).optional(),
  boosterRating: z.number().min(0).max(5).optional(),
  boosterCompletedOrders: z.number().min(0).optional(),
});

export const createOrderSchema = z.object({
  gameId: z.string().min(1),
  serviceId: z.string().min(1),
  startRankId: z.string().min(1),
  endRankId: z.string().min(1),
  currency: z.enum(SupportedCurrencies).default(DEFAULT_CURRENCY),
  clientNotes: z.string().max(2000).optional(),
});

export const payOrderSchema = z.object({
  currency: z.enum(SupportedCurrencies).optional(),
  phone: z.string().min(6).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PriceQuoteInput = z.infer<typeof priceQuoteSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type PayOrderInput = z.infer<typeof payOrderSchema>;

export { UserRoles, OrderStatuses };
