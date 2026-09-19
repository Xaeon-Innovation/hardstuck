import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  CRON_SECRET: z.string().min(8).optional(),
  VAULT_ENCRYPTION_KEY: z.string().optional(),
  PAYMENT_PROVIDER: z.enum(["manual", "polar"]).default("manual"),
  POLAR_ACCESS_TOKEN: z.string().optional(),
  POLAR_WEBHOOK_SECRET: z.string().optional(),
  POLAR_PRODUCT_ID: z.string().optional(),
  CLOSED_BETA: z
    .string()
    .optional()
    .transform((v) => v === "1" || v?.toLowerCase() === "true"),
  EUR_PER_USD: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

/** Validate env once per process. Soft fields optional in development. */
export function getEnv(): AppEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }

  const data = parsed.data;
  if (data.NODE_ENV === "production") {
    if (!data.CRON_SECRET) {
      throw new Error("CRON_SECRET is required in production");
    }
    if (!data.VAULT_ENCRYPTION_KEY) {
      throw new Error("VAULT_ENCRYPTION_KEY is required in production");
    }
    if (data.PAYMENT_PROVIDER === "polar") {
      if (!data.POLAR_ACCESS_TOKEN || !data.POLAR_WEBHOOK_SECRET || !data.POLAR_PRODUCT_ID) {
        throw new Error("Polar env vars required when PAYMENT_PROVIDER=polar");
      }
    }
  }

  cached = data;
  return data;
}

export function isClosedBeta(): boolean {
  try {
    return Boolean(getEnv().CLOSED_BETA);
  } catch {
    return process.env.CLOSED_BETA === "1" || process.env.CLOSED_BETA === "true";
  }
}
