# HardStuck — Implementation Task Checklist

Track MVP and post-MVP work from [BRD-FRS.md](./BRD-FRS.md).  
Payments use **Paymob** (not Stripe). Default currency **USD** with multi-currency support.

**Legend:** `[x]` done in foundation scaffold · `[ ]` remaining

---

## 0. Foundation (scaffold)

- [x] Monorepo: `apps/api`, `apps/web`, `packages/shared`
- [x] Docker Compose: MongoDB 7 + Redis 7
- [x] Root `.env.example` with Paymob + JWT + DB vars
- [x] Shared enums, currency list, Zod auth/order schemas
- [x] Mongoose models for all BRD collections (Paymob field names)
- [x] Seed: LoL / Valorant / Apex, Solo/Duo, ranks, pricing_config, admin user
- [x] Auth shell: register, login, JWT, verify-email stub, forgot-password stub
- [x] Pricing quote algorithm shell (rank × hours × service × dynamic adjustments)
- [x] Orders: draft create, pay → Paymob intention, webhook HMAC, simulate-success
- [x] Order queue entry on successful payment
- [x] Socket.io stub (join-order, typing)
- [x] Bull job shells: email, weekly payouts, re-verification
- [x] Admin API shells: overview KPIs, users, orders, payments
- [x] React shells: marketing, auth, order wizard + Paymob redirect, client/booster/admin
- [x] README + this TASKS.md

---

## 1. Authentication & accounts

- [ ] Enforce email verification before order creation (block unpaid drafts if unverified)
- [ ] Password reset email delivery (SendGrid) with 24h expiry links
- [ ] Login notification email (device / location)
- [ ] Session idle timeout + refresh token rotation endpoint
- [ ] 2FA (TOTP) setup/verify — recommended for clients, **mandatory for boosters**
- [ ] Soft-delete account + GDPR data export endpoint
- [ ] OAuth Google / Discord (Phase 1.1)
- [ ] Admin invite-only registration for `mod` / `admin` roles
- [ ] Audit log for admin invite and password overrides

**Acceptance:** Client cannot pay until email verified; booster must enable 2FA before claiming orders.

---

## 2. Booster verification (Trust & Safety)

### Tier 1 (automated)
- [ ] Rank screenshot upload + storage (S3/Cloudinary/MinIO)
- [ ] Email domain reputation check
- [ ] Username uniqueness already in place — extend with reserved-name list
- [ ] Status transition: `pending` → `verified_tier1`

### Tier 2 (manual, 24–48h)
- [ ] ID document + selfie upload
- [ ] Liveness / metadata validation stub or vendor
- [ ] Admin review UI: approve / reject with reason
- [ ] Status: `verified_tier1` → `verified_tier2`

### Tier 3 (gameplay, ~72h)
- [ ] Riot API match history (LoL / Valorant)
- [ ] ApexLegendsAPI (or equivalent) for Apex
- [ ] Rules: ≥5 ranked wins / 30 days at stated rank; min account level
- [ ] Device fingerprint / multi-account fraud flag
- [ ] Activate account only when `verified` (all tiers)
- [ ] Quarterly re-verification job + 30-day reminder email

**Acceptance:** Booster cannot claim queue orders until `verificationStatus === 'verified'` and `accountActivationStatus === true`.

---

## 3. Orders, pricing & queue

- [ ] Full order status machine + client cancel within 1h (100% refund path)
- [ ] Booster claim / start / complete + completion proof upload
- [ ] Client confirm completion; auto-confirm after 48h
- [ ] Dispute window (7 days) with evidence upload
- [ ] FIFO queue with Plus member +2 priority boost
- [ ] Auto-assign if queue wait > 2 days
- [ ] Client queue position + estimated wait UI
- [ ] Pricing Tuning Dashboard (admin) editing `pricing_config` + audit log
- [ ] Order receipts / invoice PDF download
- [ ] Reorder quick-link from history

**Acceptance:** Happy path draft → paid → in_queue → in_progress → completed → funds hold → payout eligible.

---

## 4. Paymob payments, escrow, refunds, payouts & multi-currency

- [ ] Live Paymob Intention + Unified Checkout with production keys
- [ ] HMAC verification enforced in all environments (fail closed)
- [ ] Idempotent webhook handling for retries / duplicates
- [ ] Multi-currency checkout (USD default; EGP, AED, SAR, EUR, GBP)
- [ ] FX / display rates policy documented (store charge currency on order)
- [ ] Refund API (full / partial %) wired to Paymob refund + order status
- [ ] Void for unpaid / abandoned intentions
- [ ] Escrow ledger: platform holds funds; booster earnings accrued on confirm
- [ ] 48h hold after completion before payout eligibility
- [ ] Weekly payout job (Mondays): min threshold $50 (or currency equiv)
- [ ] Booster payout methods: bank transfer + Paymob payout where available
- [ ] Chargeback / dispute webhook handling → fraud flag + admin alert
- [ ] Plus membership recurring billing via Paymob (or local renewal job)
- [ ] Admin payments UI: search, refund, manual payout override

**Acceptance:** Paid order never enters queue without verified webhook (or explicit admin override); refunds reverse earnings correctly.

---

## 5. Chat (Socket.io)

- [ ] Persist messages to `chat_messages` (text + image attachments ≤5MB)
- [ ] Typing indicators + read receipts
- [ ] Load last 50 messages on join
- [ ] Profanity / spam filter
- [ ] Admin chat override with audit log
- [ ] Export order chat to PDF
- [ ] Polling fallback for unstable mobile networks
- [ ] Load test: 1k concurrent, p99 latency < 100ms

**Acceptance:** Client ↔ booster messaging works only for participants of that order (admins override).

---

## 6. Admin dashboard

- [ ] Overview: revenue MTD/YTD, active orders, growth charts
- [ ] Financial: commission vs payouts, refund/chargeback rates by currency
- [ ] Users: search, suspend/ban, force re-verify, activity log
- [ ] Orders funnel + completion metrics by game
- [ ] CMS: announcements, ranks/services CRUD, TOS versioning
- [ ] Fraud alert dashboard
- [ ] Exportable admin audit logs

**Acceptance:** Mods can resolve disputes and tickets; only admins adjust pricing and payouts.

---

## 7. Support tickets

- [ ] Client ticket create (types, priority, attachments ≤10MB)
- [ ] Auto-assign by issue type
- [ ] Mod queue with SLA timers (48h / 24h urgent)
- [ ] Replies + internal notes
- [ ] Response templates
- [ ] Knowledge base search (Phase 1.1)

**Acceptance:** Ticket statuses `open → in_progress → resolved → closed` with first-response timestamp.

---

## 8. Notifications

- [ ] In-app notifications collection wired to UI bell
- [ ] Email via SendGrid for order/payout/support events
- [ ] SMS via Twilio (opt-in) — Phase 1.1 for most types
- [ ] Web push (service worker) + FCM/APNs placeholders
- [ ] Preference center + quiet hours
- [ ] Batch promo with 48h quiet window

---

## 9. Reviews & ratings

- [ ] Post-completion review (rating + required text, verified purchase)
- [ ] Weighted average (30-day 50% / older 50%)
- [ ] Min 5 reviews before public rating display
- [ ] Profanity auto-flag + admin moderation
- [ ] Booster single response (≤500 chars)
- [ ] Completion rate weekly job
- [ ] Leaderboard (Phase 1.1)

---

## 10. Trust & safety / fraud

- [ ] Fraud flags CRUD + severity routing
- [ ] Auto-suspend on chargeback patterns
- [ ] Unusual order value alerts (e.g. new account high AOV)
- [ ] VPN / IP reputation check (Phase 1.1)
- [ ] Dispute resolution UI with decision logging
- [ ] Daily audit export

**Acceptance:** Chargeback rate tooling live before public launch; SLA alerts for urgent disputes.

---

## 11. Plus membership

- [ ] $9.99/mo (USD) subscription via Paymob
- [ ] Queue priority +2 while active
- [ ] Cancel / past_due handling
- [ ] Multi-currency price matrix (optional)

---

## 12. NFR / DevOps

- [ ] GitHub Actions CI (lint, typecheck, test)
- [ ] Docker production images for api + web
- [ ] Nginx reverse proxy + TLS docs
- [ ] PM2 ecosystem file
- [ ] Sentry error tracking
- [ ] Rate limiting (100/min IP, 1000/min user)
- [ ] CSRF on cookie-based mutating routes
- [ ] Dependabot / npm audit in CI
- [ ] Backup + restore runbook for MongoDB
- [ ] Health checks + basic Grafana/Prometheus (optional MVP)

---

## 13. Phase 1.1 (Week 9–12) — deferred

- [ ] Games: Marvel Rivals, TFT
- [ ] Services: OTP, Stream, Net Wins
- [ ] Premium support ($4.99/ticket)
- [ ] Booster performance analytics
- [ ] OAuth Google/Discord
- [ ] SMS notifications
- [ ] Message search / @mentions
- [ ] Basic admin advanced analytics

---

## 14. Phase 2+ — deferred

- [ ] Coaching marketplace
- [ ] Account marketplace
- [ ] Affiliates
- [ ] Advanced client/booster analytics
- [ ] Electron desktop app for boosters (Phase 3)

---

## Suggested sprint order

1. Finish auth (email verify + 2FA) and live Paymob HMAC/refunds  
2. Booster claim/complete + queue + chat MVP  
3. Verification tiers 1–2 + admin review  
4. Disputes, refunds, payouts job  
5. Support tickets + notifications  
6. Reviews + polish admin KPIs  
7. Hardening (CI, rate limits, load test chat) → launch  
