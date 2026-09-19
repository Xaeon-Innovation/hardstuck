# HardStuck — Tasks

Canonical plan: [`docs/IMPLEMENTATION-PLAN.md`](./docs/IMPLEMENTATION-PLAN.md).  
ADRs override [`BRD-FRS.md`](./BRD-FRS.md) where they conflict.

**Legend:** `[x]` done · `[ ]` remaining

---

## Phase 0 — Foundations

- [x] Design decisions + `CONTEXT.md`
- [x] ADRs (`docs/adr/0001`–`0004`)
- [x] `docs/IMPLEMENTATION-PLAN.md` + `docs/FUTURE.md` + Polar outreach draft
- [x] Archive prior MERN apps → `legacy/`
- [x] Next.js app `@hardstuck/web`
- [x] Docker Compose: Postgres 16 + Redis 7
- [x] Drizzle schema: Better Auth tables + orders/payment_events stubs
- [x] Better Auth route shell (`/api/auth/[...all]`)
- [x] `PaymentPort` + Polar stub + Manual adapter
- [x] Health route + Phase 0 landing page
- [x] Auth UI shell: `/register` + `/login` + risk disclosure checkbox
- [x] Persist `riskDisclosureAcceptedAt` on register
- [x] Seed script for admin user (`pnpm seed:admin`)
- [ ] `pnpm db:push` against local Docker (ops — re-run after schema changes)
- [ ] Founder: send Polar outreach email (`docs/POLAR-OUTREACH.md`)

---

## Phase 1 — Catalog + calculator

- [x] LoL + Valorant rank/server/queue config (`packages/shared/src/catalog.ts`)
- [x] Solo/Duo + add-on % multipliers
- [x] USD pricing engine + EUR display (`pricing.ts` + vitest)
- [x] Scoreboard calculator UI at `/boost`
- [x] `POST /api/quote`
- [x] ADR 0005 UI direction

---

## Phase 2 — Orders + ledger

- [x] Full order state machine + transition helpers
- [x] Hybrid assignment offers (accept TTL → requeue)
- [x] Ledger entries on pay (escrow_held)
- [x] Order detail + soft-launch pay
- [x] Booster queue page
- [x] Auto-complete / release hold / expire-offer cron
- [x] Admin Order console UI
- [x] Dispute + refund admin actions

## Phase 3 — Payments

- [x] Polar Checkout adapter + `POLAR_PRODUCT_ID` custom amount
- [x] Webhook verification via `@polar-sh/nextjs`
- [x] Idempotent `fulfillOrderPayment`
- [x] Order UI: Polar checkout + manual simulate
- [x] Setup doc `docs/POLAR-SETUP.md`
- [x] Admin refund + keep manual mark-paid

---

## Phase 4 — Vault + chat + dashboards

- [x] Solo credential vault (encrypt, audit, wipe policy)
- [x] In-app Order chat + email stub on key transitions
- [x] Client dashboard (`/dashboard`)
- [x] Booster dashboard (`/booster` — offers + orders + earnings)
- [x] Character PFP picker (LoL + Valorant) at `/account`

---

## Phase 5 — Trust & payouts

- [x] Invite-only boosters + rank proof upload + admin review
- [x] Game account details (Riot Name#Tag) on profile
- [x] ID before first payout
- [x] Payoneer/Wise payout queue
- [x] Dispute freeze on payouts

---

## Phase 6 — Soft launch

- [x] Rate limits (auth + quote/orders/trust)
- [x] Closed beta client invites (`CLOSED_BETA=true`)
- [x] Admin metrics (assign / completion / dispute)
- [x] Soft-launch runbook + `pnpm backup:pg`
- [x] Env validation helper + security headers + health DB ping

---

## Phase 7 — Catalog expansion + accounts + showcase

- [x] Multi-game homepage showcase
- [x] SkuKind quote model (rank / farm / level / unlock) — ADR 0007
- [x] Overwatch, Marvel Rivals, Apex catalogs + specialty SKUs
- [x] 75% contractor share on release; 80% seller share on accounts
- [x] Account marketplace (listings, sales, vault) — ADR 0006
- [x] Simulate-pay gated in production; Resend email hook
- [ ] `pnpm db:push` + `pnpm seed:listings` on target env
- [ ] Host + cron + secrets (see `docs/ops/SOFT-LAUNCH.md`)

## Phase 8 — Post-revenue

- [ ] US entity + Stripe adapter (see `docs/FUTURE.md`)
