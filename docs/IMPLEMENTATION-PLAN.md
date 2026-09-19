# HardStuck implementation plan

Locked decisions: see `CONTEXT.md` and `docs/adr/`.  
Prior BRD (`BRD-FRS.md`) remains historical product detail; where it conflicts with ADRs/CONTEXT, **ADRs and CONTEXT win**.

## MVP scope

| Area | MVP |
|------|-----|
| Games | League of Legends, Valorant |
| Services | Solo, Duo |
| Model | Matched pool, platform principal |
| Money | Polar (via PaymentPort) + internal escrow ledger |
| Payouts | Payoneer + Wise (admin marks paid) |
| Chat | In-app Order chat |
| Supply | Invite-only ~10–20 Boosters |
| Currency | USD ledger; EUR display |
| Stack | Next.js + TS + Postgres/Drizzle + Redis + Better Auth |

## Order states

`draft → awaiting_payment → paid → offered → assigned → in_progress → delivered → completed → released → paid_out`

Side paths: `disputed`, `refunded`, `cancelled`, `expired_offer` (requeue).

## Phases

### Phase 0 — Foundations (current)
- [x] Design grill + CONTEXT + ADRs
- [x] Next.js app scaffold (`apps/web`)
- [x] Docker: Postgres + Redis
- [x] Drizzle schema stubs (users/roles + order/payment stubs)
- [x] Better Auth shell (client / booster / admin role field)
- [x] `PaymentPort` interface + Polar stub + manual mark-paid
- [x] Env examples, README, TASKS, Polar outreach draft
- [ ] Auth UI + admin seed
- [ ] Email Polar with honest use-case description (founder ops)

### Phase 1 — Catalog + calculator
- [x] LoL + Valorant ranks/divisions/LP/servers/queues
- [x] Solo/Duo + % add-ons
- [x] Live USD price; EUR display via FX rate
- [x] Scoreboard UI (`/boost`) + NumberFlow + Motion
- [x] `POST /api/quote`

### Phase 2 — Orders + ledger
- [x] State machine + hybrid assignment offers
- [x] Ledger `escrow_held` on soft-launch pay
- [x] `/orders/[id]` + `/booster` queue
- [x] Timers cron (`/api/cron/orders`) — expire offers, auto-complete, release hold
- [x] Admin Order console (`/admin/orders`)

### Phase 3 — Payments
- [x] Polar adapter (`@polar-sh/sdk`) + custom-amount checkout
- [x] Webhook `/api/webhooks/polar` (`order.paid` → fulfill idempotent)
- [x] Order page: Pay with Polar + simulate pay fallback
- [x] Admin refund / mark-paid
- [x] `docs/POLAR-SETUP.md`

### Phase 4 — Vault + chat + dashboards
- [x] Solo credential vault (encrypt, audit, wipe policy)
- [x] In-app Order chat + email stub on key transitions
- [x] Client + Booster dashboards
- [x] Character avatar picker (LoL / Valorant)

### Phase 5 — Trust & payouts
- [x] Rank-proof upload; invite-only onboarding
- [x] Game account details (Riot Name#Tag)
- [x] ID gate before first payout
- [x] Payout request queue → Payoneer/Wise → mark paid_out
- [x] Dispute freeze

### Phase 6 — Harden + soft launch
- [x] Runbooks, rate limits, backups
- [x] Closed beta with invite Clients + Boosters
- [x] Metrics: time-to-assign, completion rate, dispute rate

### Phase 7 — Post-revenue
- US entity (Atlas) + Stripe PaymentPort adapter
- Optional Connect later; ledger remains source of truth
- Then expand catalog / coaching / accounts (new domain work)

## Team swimlanes

| Person | Owns |
|--------|------|
| Founder | PaymentPort, ledger, vault, deploy, Polar/legal, assignment timers |
| Dev A | Calculator, Client checkout UX, Client dashboard |
| Dev B | Booster claim UX, chat, admin, payout queue UI |

## Explicit non-goals (MVP)

Microservices, Electron, Mongo as system of record, open marketplace, Lemon Squeezy, game-API auto-verify, loyalty coins, EGP as primary settlement currency.
