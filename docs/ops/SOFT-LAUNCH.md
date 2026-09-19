# Soft launch runbook

Closed beta ops for HardStuck (Phase 6).

## Access

| Role | How |
|------|-----|
| Admin | `pnpm seed:admin` or promote via `scripts/promote-admin.ts` |
| Client | Invite code from `/admin/trust` → **Client invite** (requires `CLOSED_BETA=true`) |
| Booster | Register as client → redeem **Booster invite** on `/account` → rank proof + ID |

## Env checklist

- `CLOSED_BETA=true` for invite-only clients
- `CRON_SECRET`, `VAULT_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET`
- `PAYMENT_PROVIDER=manual` until Polar AUP; then `polar` + keys

## Daily / weekly

1. **Timers:** `pnpm cron:orders` (or POST `/api/cron/orders` with `Authorization: Bearer $CRON_SECRET`)
2. **Trust:** `/admin/trust` — rank proofs, IDs, create invites
3. **Orders:** `/admin/orders` — mark paid, refund, dispute, re-offer
4. **Payouts:** `/admin/payouts` — send Payoneer/Wise, then Mark paid
5. **Metrics:** `/admin/metrics` — time-to-assign, completion, dispute rate
6. **Backup:** `pnpm backup:pg` (see below)

## Disputes

1. Admin → Orders → Dispute
2. Pending payout for that order is cancelled; booster payouts freeze while any dispute is open
3. Resolve → refund or return to progress/completed

## Polar

See `docs/POLAR-SETUP.md`. Webhook: `{APP_URL}/api/webhooks/polar`.

## Deploy checklist (code ready)

1. Managed Postgres + Next host with persistent uploads (or R2)
2. Secrets: `BETTER_AUTH_SECRET`, `CRON_SECRET`, `VAULT_ENCRYPTION_KEY`, `CLOSED_BETA=true`
3. Optional: `RESEND_API_KEY`, `EMAIL_FROM`
4. `pnpm db:push` → `pnpm seed:admin` → `pnpm seed:listings`
5. Confirm `GET /api/health` → `ok: true`, `phase: 7`, `databaseOk: true`
6. Schedule cron → `POST /api/cron/orders` with Bearer secret
7. `PAYMENT_PROVIDER=manual` until Polar AUP; simulate-pay auto-hides when polar + production
8. Smoke: climb + farm SKU + account sale end-to-end

## Health

`GET /api/health` — expects `ok: true`, `phase: 7`, `databaseOk: true`.

## Showcase inventory

```bash
pnpm seed:admin
pnpm seed:listings
```

## Email

Set `RESEND_API_KEY` + `EMAIL_FROM` for real mail; otherwise notifications log to console.

## Backups

```bash
pnpm backup:pg
```

Writes `backups/hardstuck-YYYYMMDD-HHMM.sql` from Docker Postgres.  
Also copy `apps/web/public/uploads/` (rank proofs + ID docs) off-box weekly.
