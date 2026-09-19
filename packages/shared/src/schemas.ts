import { z } from "zod";
import { GameSlugs, ServiceTypes, UserRoles } from "./enums";
import { ADD_ONS, LP_BANDS, LP_GAIN_BANDS } from "./catalog";

export const DisplayCurrencies = ["USD", "EUR"] as const;
export type DisplayCurrency = (typeof DisplayCurrencies)[number];
export const LEDGER_CURRENCY = "USD" as const;

const addOnKeys = ADD_ONS.map((a) => a.key) as [string, ...string[]];
const lpBands = LP_BANDS.map((b) => b.key) as [string, ...string[]];
const lpGains = LP_GAIN_BANDS.map((b) => b.key) as [string, ...string[]];

export const registerSchema = z.object({
  username: z.string().min(3).max(32),
  email: z.string().email(),
  password: z
    .string()
    .min(12)
    .regex(/[a-z]/, "Must include lowercase")
    .regex(/[A-Z]/, "Must include uppercase")
    .regex(/[0-9]/, "Must include a number")
    .regex(/[^A-Za-z0-9]/, "Must include a symbol"),
  role: z.enum(["client", "booster"]).default("client"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const priceQuoteSchema = z.object({
  game: z.enum(GameSlugs),
  serviceType: z.enum(ServiceTypes),
  startRankKey: z.string().min(1).default("n/a"),
  endRankKey: z.string().min(1).default("n/a"),
  server: z.string().min(1).default("pc"),
  queue: z.string().min(1).default("default"),
  currentLpBand: z.enum(lpBands).optional(),
  lpGainBand: z.enum(lpGains).optional(),
  addOnKeys: z.array(z.enum(addOnKeys)).default([]),
  displayCurrency: z.enum(DisplayCurrencies).default("USD"),
  eurPerUsd: z.number().positive().optional(),
  skuSlug: z.string().min(1).optional(),
  skuPayload: z
    .object({
      unitKey: z.string().optional(),
      startLevel: z.number().int().optional(),
      endLevel: z.number().int().optional(),
      quantity: z.number().int().positive().optional(),
    })
    .optional(),
});

export const createOrderSchema = priceQuoteSchema.extend({
  clientNotes: z.string().max(2000).optional(),
  riskDisclosureAccepted: z.literal(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PriceQuoteInput = z.infer<typeof priceQuoteSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export { UserRoles };
