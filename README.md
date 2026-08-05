# HardStuck

Game boosting and services platform (MERN). Clients order Solo/Duo boosts for LoL, Valorant, and Apex; verified boosters claim jobs; payments run through **Paymob** (USD default, multi-currency).

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind, Socket.io client |
| Backend | Node.js, Express, TypeScript, Socket.io, Bull |
| Database | MongoDB 7 + Mongoose |
| Cache / jobs | Redis 7 |
| Payments | Paymob Intention API + Unified Checkout + HMAC webhooks |

## Monorepo

```
apps/api      — Express API
apps/web      — React SPA
packages/shared — Shared enums, Zod schemas
```

## Quick start

```bash
# Requires Node 20+, pnpm, Docker
cp .env.example .env

pnpm install
pnpm docker:up          # MongoDB + Redis
pnpm --filter @hardstuck/shared build
pnpm seed               # games, ranks, services, admin
pnpm dev                # API :5000 + Web :5173
```

**Seed admin:** `admin@hardstuck.local` / `AdminPass123!` (override via `.env`)

### Smoke flow

1. Open http://localhost:5173  
2. Register a client (or log in as admin)  
3. **Order boost** → select game/ranks → Get quote → Pay with Paymob  
4. Without live Paymob keys, payment is **stubbed** and auto-simulated into `in_queue`

## Paymob

Env vars (see `.env.example`):

- `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_HMAC_SECRET`
- `PAYMOB_INTEGRATION_ID_CARD`
- `PAYMOB_DEFAULT_CURRENCY=USD`
- `PAYMOB_SUPPORTED_CURRENCIES=USD,EGP,AED,SAR,EUR,GBP`

Webhook: `POST /api/payments/paymob/webhook?hmac=...`  
Dev simulate: `POST /api/payments/paymob/simulate-success/:orderId`

Escrow is **platform-held** (merchant account) with an internal booster earnings ledger and a weekly payout job shell — not Stripe Connect.

## Docs

- [BRD-FRS.md](./BRD-FRS.md) — product & technical requirements  
- [TASKS.md](./TASKS.md) — implementation checklist (MVP → Phase 2)

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run API + web |
| `pnpm seed` | Seed MongoDB |
| `pnpm build` | Build all packages |
| `pnpm docker:up` / `docker:down` | Local Mongo + Redis |
