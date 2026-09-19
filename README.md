# HardStuck

Matched-pool ranked boosting for **League of Legends** and **Valorant** (Solo / Duo). The platform assigns verified boosters and acts as merchant of record for the client order.

## Stack (current)

| Layer | Tech |
|-------|------|
| App | Next.js (App Router) + TypeScript |
| DB | PostgreSQL 16 + Drizzle |
| Auth | Better Auth (client / booster / admin roles) |
| Cache / jobs | Redis 7 |
| Payments | `PaymentPort` → Polar (primary) / manual (soft-launch) / Stripe (later) |

Vocabulary: [`CONTEXT.md`](./CONTEXT.md) · Decisions: [`docs/adr/`](./docs/adr/) · Plan: [`docs/IMPLEMENTATION-PLAN.md`](./docs/IMPLEMENTATION-PLAN.md) · Future: [`docs/FUTURE.md`](./docs/FUTURE.md)

> The old Express + Mongo + Paymob scaffold lives under [`legacy/`](./legacy/) and is **frozen**.

## Quick start

```bash
# Node 20+, pnpm, Docker
cp .env.example .env

pnpm install
pnpm docker:up          # Postgres :5434 + Redis :6380
pnpm --filter @hardstuck/shared build
pnpm db:push            # apply Drizzle schema
pnpm dev                # http://localhost:3000
```

> **Ports:** Host `5432`/`6379` are often taken (e.g. other Docker apps). Compose maps **Postgres → localhost:5434** and **Redis → localhost:6380**. Match `DATABASE_URL` / `REDIS_URL` in `.env` (see `.env.example`).

Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### Payments

- Default soft-launch: `PAYMENT_PROVIDER=manual` in `.env`
- Polar: see [`docs/POLAR-SETUP.md`](./docs/POLAR-SETUP.md) — set `PAYMENT_PROVIDER=polar`, tokens, custom-price `POLAR_PRODUCT_ID`, webhook → `/api/webhooks/polar`
- Escrow is an **internal ledger**, not Polar/Stripe Connect splits ([ADR 0004](./docs/adr/0004-ledger-escrow.md))
- Cron timers: `POST /api/cron/orders` with `Authorization: Bearer $CRON_SECRET`
- Promote admin: register user, then `pnpm --filter @hardstuck/web exec tsx --env-file=../../.env scripts/promote-admin.ts you@email.com`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js on :3000 |
| `pnpm build` | Shared + web production build |
| `pnpm db:push` | Push Drizzle schema to Postgres |
| `pnpm docker:up` / `docker:down` | Local Postgres + Redis |

## Phase status

Phase 0 (foundations) in progress — see [`docs/IMPLEMENTATION-PLAN.md`](./docs/IMPLEMENTATION-PLAN.md) and [`TASKS.md`](./TASKS.md).
