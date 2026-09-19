import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  apiUrl: process.env.API_URL ?? 'http://localhost:5000',
  webUrl: process.env.WEB_URL ?? 'http://localhost:5173',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/hardstuck',
  mongodbPoolSize: Number(process.env.MONGODB_POOL_SIZE ?? 10),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret: required('JWT_SECRET', 'dev-jwt-secret-change-me'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? '24h',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '30d',
  paymob: {
    secretKey: process.env.PAYMOB_SECRET_KEY ?? '',
    publicKey: process.env.PAYMOB_PUBLIC_KEY ?? '',
    hmacSecret: process.env.PAYMOB_HMAC_SECRET ?? '',
    integrationIdCard: Number(process.env.PAYMOB_INTEGRATION_ID_CARD ?? 0),
    baseUrl: process.env.PAYMOB_BASE_URL ?? 'https://accept.paymob.com',
    defaultCurrency: process.env.PAYMOB_DEFAULT_CURRENCY ?? 'USD',
    supportedCurrencies: (process.env.PAYMOB_SUPPORTED_CURRENCIES ?? 'USD,EGP,AED,SAR,EUR,GBP')
      .split(',')
      .map((c) => c.trim().toUpperCase()),
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@hardstuck.local',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'AdminPass123!',
    adminUsername: process.env.SEED_ADMIN_USERNAME ?? 'admin',
  },
};
