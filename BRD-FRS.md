# HardStuck PLATFORM
## Business Requirements Document (BRD) & Functional Requirements Specification (FRS)
## Enhanced Project Specification with Refined ClickUp Workflow

**Version:** 3.0 (Enhanced)  
**Date:** December 26, 2025  
**Status:** Ready for Development  
**Platform:** Web + Mobile Responsive (MERN Stack)  
**Infrastructure:** VPS Hosting  
**Future:** Electron Desktop App for Boosters (Phase 3)  
**Tech Stack:** React, Express.js, MongoDB, Node.js, Stripe, WebSocket (Socket.io), Electron (Phase 3)

---

## 📋 TABLE OF CONTENTS

1. Executive Summary
2. Business Overview & Strategy
3. MVP Scope Definition (Refined)
4. Detailed Feature Specifications
5. Data Schema (MongoDB)
6. User Roles & Permissions Matrix
7. Payment & Pricing Logic
8. Trust & Safety Framework
9. Non-Functional Requirements
10. Technical Architecture
11. ClickUp Workflow & Project Lifecycle (Enhanced)
12. Implementation Roadmap
13. Post-MVP Roadmap (Phase 2 & 3)

---

## EXECUTIVE SUMMARY

HardStuck is a B2C gaming services platform that connects verified professional boosters with gamers seeking ranked boosting services across major competitive titles.

### Key Business Metrics (Target Year 1)

| Metric | Target |
|--------|--------|
| Revenue Model | Commission-based (70% booster, 30% platform) |
| Target Markets | NA, EU, APAC regions |
| **MVP Game Coverage** | **3 AAA titles (LoL, Valorant, Apex)** |
| Projected Boosters (Year 1) | 200-300 verified professionals |
| Monthly Active Users (Target) | 2,000-3,000 clients (Year 1) |
| Average Order Value | $100 - $400 USD |
| Platform Commission | 25-35% per transaction |
| Target Launch to $50K MRR | 6-8 months |

### Value Proposition

**For Boosters:** Stable income, transparent payments, brand protection, desktop app access (Phase 3), booster performance dashboard

**For Clients:** Fast, safe, verified boosting with transparent pricing, real-time chat support, quality guarantees

**For Platform:** Trust, safety, sustainable community, repeatable revenue

---

## BUSINESS OVERVIEW & STRATEGY

### Market Opportunity

The HardStucking market is valued at $2.5B+ globally in 2025 with 35% YoY growth. Competitive advantages:

| Factor | Our Approach |
|--------|--------------|
| Quality Assurance | Strict booster verification + account suspension risk mitigation + gameplay proof requirements |
| Trust | Built-in reputation system with verified badges + booster performance metrics |
| Transparency | All-in pricing (no hidden fees), algorithm-based pricing with admin tuning UI |
| Scalability | MERN microservices architecture, VPS-optimized, WebSocket real-time infrastructure |
| Accessibility | Web app + future Electron desktop app for power users |
| Compliance | TOS enforcement, account security standards, KYC for boosters, fraud monitoring |
| Risk Management | Dedicated Trust & Safety epic with verification, fraud checks, dispute handling |

### Monetization Strategy

1. **Commission per Order** (30% platform take)
2. **Plus Membership** ($9.99/mo) - faster queue access, exclusive perks
3. **Premium Support** ($4.99 per ticket for non-standard issues)
4. **Future:** Coaching services, account marketplace, affiliate program, Electron desktop premium

### Risk Mitigation

**Account Security:** Enforce 2FA, login notifications, IP whitelisting, VPN detection rules

**Booster Verification:** Multi-step verification (ID, gameplay records, reviews) with re-verification quarterly

**Chargeback Protection:** Escrow-based payment (funds held until order completion) + 48h hold period

**Fraud Monitoring:** Automated detection for multiple chargebacks, unusual order patterns, repeated disputes → Admin alerts

**Terms of Service:** Clear liability clauses, refund policy (48h money-back), account suspension protocol

**Infrastructure Redundancy:** VPS with failover, database replication, backup strategy, automated monitoring

---

## MVP SCOPE DEFINITION (REFINED)

### MVP Phase Definition (Weeks 1-8)

**Primary Games:** League of Legends, Valorant, Teamfight Tactics (3 games max)

**Primary Services:** Solo, Duo (2 service types; OTP/Stream as Phase 1.1)

**Primary Features:** Authentication, order system, payment, chat, basic admin, support tickets

**NOT in MVP (Phase 2+):** Coaching, account marketplace, Electron desktop, multi-currency, affiliates, advanced analytics

### MVP vs. Phase 1.1 vs. Phase 2 Breakdown

| Feature | MVP (Week 1-8) | Phase 1.1 (Week 9-12) | Phase 2 (Month 4+) |
|---------|---|---|---|
| **Games** | LoL, Val, Apex | + Marvel Rivals, TFT | + CS:GO, others on demand |
| **Services** | Solo, Duo | + OTP, Stream, Net Wins | Role-specific, custom |
| **Booster Dashboard** | Basic (earnings, orders, rating) | + Perf analytics, dispute handling | + Leaderboard, engagement tools |
| **Plus Membership** | ✅ Queued | ✅ Live | Enhanced tiers |
| **Coaching** | ❌ | ❌ | ✅ |
| **Marketplace** | ❌ | ❌ | ✅ |
| **Electron Desktop** | ❌ | ❌ | ✅ Phase 3 |
| **Premium Support** | ❌ | ✅ | Enhanced |
| **Advanced Analytics** | ❌ | Basic (Admin only) | Full (Client + Booster) |

---

## DETAILED FEATURE SPECIFICATIONS

### MVP FEATURES (Phase 1: Development, Design, Deploy - 8 weeks)

#### 1. AUTHENTICATION & ACCOUNT MANAGEMENT

##### 1.1 Client Registration & Onboarding
- Email/password registration with email verification
- OAuth: Google, Discord (optional, Phase 1.1)
- KYC not required for clients (only for payouts >$10k/year)
- 2FA setup recommended (SMS/Authenticator)
- Profile: username, avatar, real email, 2FA status
- Email verification mandatory before order creation

##### 1.2 Booster Registration & Verification (Trust & Safety Epic)
**Three-tier verification process (before account activation):**

**Tier 1 (Instant - Automated):**
- Email, username, avatar, in-game rank credential (rank screenshot)
- Automated check: Email domain reputation, username uniqueness
- Status: pending → verified_tier1

**Tier 2 (24-48h - Manual):**
- Identity verification (ID document upload + selfie match)
- Liveness check: Selfie must be recent (metadata validation)
- Manual admin review, compliance check
- Status: verified_tier1 → verified_tier2

**Tier 3 (72h - Gameplay Verification):**
- Ranked match history pull from Riot API (LoL) / Valve API (Valorant) / ApexLegendsAPI (Apex)
- Verify at least 5 ranked wins in past 30 days at stated rank
- Account age check: Minimum account level 30 (LoL), 20 (Valorant), etc.
- Fraud flagging: Multiple accounts with same device ID → manual review

**Booster cannot accept orders until all tiers passed.**

**Verification status:** pending, verified_tier1, verified_tier2, verified (all tiers), suspended, rejected

**Account activation:** Only activated after Tier 3 approval; re-verification quarterly

**Quarterly Reverification:**
- Pull rank again from game API, verify still meets minimum
- If rank dropped > 2 tiers or multiple chargebacks → flag for manual review

##### 1.3 Admin & Moderator Registration
- Invite-only system (only admins can invite)
- Role assignment at creation: Admin or Moderator
- Email-based authentication + 2FA mandatory for admins
- Audit log: All admin actions recorded

##### 1.4 Password Management
- Secure password reset via email (24h link expiry)
- Password strength requirements (12+ chars, mixed case, numbers, symbols)
- Session management (24h idle timeout, refresh token rotation)
- Login notification email (with device/location info)

---

#### 2. BOOSTER VERIFICATION & MANAGEMENT

##### 2.1 Booster Dashboard (Private)
- Verified status badge (Tier 1/2/3, re-verification date)
- Available games & ranks (for MVP: LoL, Valorant, Apex)
- Rating/review score + review count + % verified purchases
- Earnings this month (real-time + lifetime total)
- Orders queue & status (active, pending, completed)
- Performance metrics (completion rate %, average rating %, dispute rate %)
- Profile completion % (guides, certifications - Phase 1.1)
- Payment method on file (for payouts)
- **New:** "Booster Performance Dashboard" v1 showing:
  - Earnings per hour (calculated)
  - Completion rate %
  - Dispute rate %
  - Rating trend (30-day average)
  - Monthly earnings breakdown by game

##### 2.2 Game Registration (Per Booster)
- Link game account (handle + current rank)
- Multiple accounts per game (main, OTP, alt - Phase 1.1)
- Rank verification: Fetch from Riot API (LoL) / Valve API (Val) / ApexLegendsAPI (Apex)
- Valid services for each game (pre-configured in MVP):
  - **LoL:** Solo, Duo
  - **Valorant:** Solo, Duo
  - **Apex:** Solo, Duo

##### 2.3 Booster Notifications (Real-time)
- New order in queue: Push + In-app (SMS in Phase 1.1)
- Order accepted/starting: Confirmation
- Client messages: Real-time chat alert
- Payout processed: Email confirmation
- Review received: In-app notification + email
- Account suspension warning: Email (SMS in Phase 1.1)
- Tier 3 verification expiration (30-day reminder): Email

##### 2.4 Admin Booster Management Panel
- View all boosters (status, earnings, rating, games)
- Filter by: verification status, game, region, rating, suspension status
- Suspend/ban for TOS violations (with reason notification)
- Verify/reject pending applications (Tier 2 & 3)
- View earnings breakdown by booster + payout history
- Manage payment methods & payouts
- Review dispute cases + fraud flags
- Bulk actions: Suspend for fraud, force re-verification, message boosters

---

#### 3. CLIENT ORDER SYSTEM

##### 3.1 Order Creation Flow
1. Select game (MVP: LoL, Val, Apex only)
2. Select service type (Solo or Duo only in MVP)
3. Input current rank (start point)
4. Input desired rank (end point)
5. System calculates price (algorithm-based)
6. Review order details
7. Proceed to payment (Stripe)

##### 3.2 Order Status Lifecycle
```
draft → submitted → in_queue → in_progress → completed
                       ↓
                   cancelled (by client, 1h window, full refund)
                       ↓
                   disputed (quality/completion issues, 7-day window)
```

**Status Definitions:**
- **draft:** Order created but not submitted for payment
- **submitted:** Payment processing
- **in_queue:** Waiting for booster to claim (auto-assign if > 2 days)
- **in_progress:** Booster actively working on order
- **completed:** Booster submitted completion proof, awaiting client confirmation
- **cancelled:** Client or admin cancelled within window
- **disputed:** Quality issue raised by client or booster

##### 3.3 Pricing Algorithm (Refined - Rank + Service Based)

**Base Formula:**
```
Base Price = (Rank Difficulty × Hours Estimated) + Service Multiplier

Rank Difficulty (0-100 scale):
- Iron → Bronze: 1.0x
- Silver: 1.5x
- Gold: 2.0x
- Platinum: 2.5x
- Diamond: 3.5x
- Master+: 5.0x+

Service Multiplier:
- Solo: 1.0x
- Duo: 0.8x (lower difficulty, client help)

Dynamic Adjustment:
- Queue wait time > 2 days: +10%
- Booster rating < 4.0: -15%
- New booster (< 10 completed orders): -20%
- Peak hours (6pm-2am UTC): +5-15%
```

**Example Calculations (MVP):**
- Iron → Gold (LoL Solo): $45-75
- Gold → Platinum (LoL Duo): $120-180
- Platinum → Diamond (Val Solo): $150-250

**Pricing Configuration (NEW):**
- Create `pricing_config` collection in MongoDB for game/rank/service multipliers
- Admin can adjust multipliers via "Pricing Tuning Dashboard" (Phase 1.1 minimal UI)
- Changes logged with timestamps + admin user for audit trail
- No code redeploy needed for pricing tweaks

##### 3.4 Order Queue Management
- First-in, first-out (FIFO) with boosters pulling from queue
- Boosters can claim available orders (within their verified games/ranks)
- Auto-assignment if queue > 2 days (notify booster + client)
- Queue priority: Plus members get +2 position boost
- Queue status: Estimated start time (ML-based - Phase 1.1)
- Queue visibility: Clients see "Position: X / Estimated wait: Y hours"

##### 3.5 Client Order History
- View all past orders with status, booster rating, completion time
- Filter by game, status, date range
- Download receipt/invoice (for accounting)
- Reorder quick-link for common orders
- Order details include: service type, ranks, price breakdown, booster name/rating

##### 3.6 Order Completion & Dispute Flow (NEW)

**Completion Process:**
1. Booster marks order "complete" + submits proof (screenshot or match ID)
2. System stores proof as evidence in order record
3. Client notified: "Booster completed. Review and confirm?"
4. Client has 48h to confirm or dispute
5. If no response after 48h: Auto-confirmed, funds released

**Dispute Process (7-day window from completion):**
1. Client or booster initiates dispute (reason: quality issue, rank not achieved, etc.)
2. Evidence presented (match history, screenshots)
3. Admin review (prioritized, 24h SLA)
4. Outcome: Refund % (0-100%), order resolved

---

#### 4. CHAT SERVICE (Booster ↔ Client)

##### 4.1 Real-time Chat Architecture
- WebSocket-based bidirectional communication (Socket.io)
- Fallback to polling for mobile devices (unstable networks)
- Message persistence (7-day retention in DB, archival after)
- Typing indicators ("Booster is typing...")
- Read receipts (sent, delivered, read)
- Message history on app load (last 50 messages)
- Electron Desktop: Native chat notifications (Phase 3)

##### 4.2 Chat Features
- One-to-one (client ↔ booster per order)
- Message types: text, images (max 5MB), game screenshots
- Moderation: Auto-filter profanity, spam detection
- Admin override: Admins can view/moderate any chat (audit log)
- Export chat: Client can export order chat for records (PDF)
- Message search: Basic search within order chat (Phase 1.1)

##### 4.3 Chat Notifications
- New message: Push + in-app (unless muted)
- Unread count in sidebar
- @mentions for important messages (Phase 1.1)
- Delivery status: sent, delivered, read

##### 4.4 Load Testing & Performance (NEW)
- Load test Socket.io with 1,000+ concurrent users
- Measure message latency < 100ms p99
- Fallback polling test: Performance on slow networks
- Spike test: 5000 messages/minute

---

#### 5. PAYMENT SYSTEM (Stripe Integration)

##### 5.1 Payment Processing
- Payment Gateway: Stripe
- Supported Methods: Credit cards, Apple Pay, Google Pay
- Currencies: USD primary (EUR, GBP, AUD in Phase 1.1+)
- Transaction Fee: Stripe standard (1.5% + $0.30 for cards)
- Escrow Model: Client funds held in Stripe Connect account until order completion

##### 5.2 Client Payment Flow
1. Create order → Proceed to Stripe Checkout (embedded)
2. Stripe tokenizes payment (no sensitive data touches your servers)
3. On success → Order moves to "in_queue" status
4. Webhook: `payment_intent.succeeded` → Create order record, notify booster
5. Failed payment → Order auto-cancelled after 1 hour (allow retry)

##### 5.3 Booster Payout System
- Automatic weekly payouts (Mondays, via Stripe Connect)
- Minimum payout threshold: $50
- Hold period: 48h after order completion (chargeback protection)
- Payout methods: Bank account (US/EU/AUS) or card transfer
- Tax reporting: Form 1099 for US boosters (automated)
- Fee: 2% platform fee on payouts (Stripe Connect)

##### 5.4 Refund & Chargeback Handling (Trust & Safety Epic)

**Client-initiated refund (within 48h of order completion):**
- Criteria for approval:
  - Booster didn't accept order within 24h → 100% refund
  - Order didn't complete (booster inactivity) → 100% refund
  - Quality dispute (wrong rank achieved) → Case-by-case (50-100%)
  - Client cancelled (no reason) within 1h → 100% refund, booster keeps 0%

**Dispute handling (> 48h):**
- Admin review required (48h SLA)
- Evidence: match history, screenshots, chat logs
- Decision: Refund %, suspension status

**Chargeback disputes:**
- Auto-suspend booster account pending investigation
- Stripe webhook: `charge.dispute.created` → Alert admin
- Manual review within 24h
- Outcome: Uphold or refund chargeback fee to booster

##### 5.5 Payment Webhook Events (Critical)
```
payment_intent.succeeded → Create order
payment_intent.payment_failed → Notify client, allow retry
charge.refunded → Mark order refunded, reverse booster earnings
charge.dispute.created → Alert admin, flag booster
charge.dispute.won → Update payout status
```

---

#### 6. ADMIN DASHBOARD

##### 6.1 Analytics & Reporting (MVP - Core, Phase 1.1+ - Advanced)

**Overview Tab:**
- Total revenue (MTD, YTD, 7-day trend)
- Active orders count (in_queue, in_progress)
- Platform health (uptime %, API response time p95)
- User growth chart (new clients, new boosters this week)
- Key KPIs: Completion rate %, average order value, booster utilization %

**Financial Tab:**
- Revenue breakdown (commission earned vs. payout)
- Payout summary (total paid out, pending, on hold)
- Stripe account balance + pending disputes
- Top revenue games (breakdown chart)
- Refund rate % + chargeback rate %
- Commission analysis by game/service

**Users Tab:**
- Client count (active, new this week, churn)
- Booster count (verified, pending verification, suspended, banned)
- User engagement (orders per client avg, booster utilization %)
- Churn rate (last 30 days)
- Verification pipeline (Tier 1, 2, 3 conversion rates)

**Orders Tab:**
- Orders by status (funnel view: in_queue → completed)
- Completion rate % by game
- Average completion time per game (median + p95)
- Service popularity breakdown (Solo vs. Duo %)
- Order success rate (completed / total submitted %)
- Dispute rate % + dispute resolution time

##### 6.2 User Management
- Search/filter users by username, email, ID, role
- View user details: account creation date, orders, spending, total earnings
- Manually verify/reject booster applications (Tier 2 & 3)
- Suspend/ban users with reason + automatic notification
- Reset user password (admin override, with audit log)
- View user activity logs (orders, chats, logins, verifications)
- Re-verification trigger (force quarterly re-check)

##### 6.3 Payment Management
- Stripe Connect dashboard embed
- View all transactions (search, filter by date/status)
- Manual payout processing (if auto-weekly fails)
- Refund management UI (approve/deny disputed refunds)
- Chargeback dispute tracking + resolution timeline
- Payout deductions log (reason, amount, date)

##### 6.4 Content Management
- Blog/News posts (in-app announcements, visible on homepage)
- Game rank list management (tier names, divisions, images)
- Service type management (add/edit/delete for future games)
- Pricing algorithm tuning (multiplier adjustments, base rates) - NEW
- TOS & Privacy Policy versioning + acceptance tracking
- Notification templates (email/SMS/push)

##### 6.5 Support & Trust Tools
- View all support tickets (queue, assignment, SLA tracking)
- Assign tickets to mods
- Chat override (view booster-client messages, with audit log)
- Dispute resolution interface (evidence review, decision logging)
- Fraud alert dashboard (chargebacks, unusual patterns, flagged accounts)
- Bulk actions: Ban for fraud, force re-verify, send message

##### 6.6 Admin Audit Trail (NEW)
- All admin actions logged: suspension, verification, refunds, pricing changes
- Include: Admin user, action type, target, timestamp, reason/notes
- Queryable by date, admin, action type
- Export audit logs (compliance)

---

#### 7. SUPPORT SYSTEM

##### 7.1 Support Ticket Portal (Client-facing)
- Issues: Account access, refund request, quality dispute, technical issue
- Form fields: Subject, description, attachments (screenshots, max 10MB total), priority
- Auto-assign based on issue type
- Status tracking: open, in_progress, resolved, closed
- SLA: 48h first response for all tickets, 24h for "urgent"

##### 7.2 Support Ticket Admin Dashboard
- Ticket queue (sorted by priority + oldest first, SLA timer)
- Assigned tickets per moderator
- Ticket details with full history (messages, attachments)
- Quick actions: assign, reassign, resolve, escalate
- Knowledge base (searchable solutions, used for auto-responses)
- Bulk operations: close old tickets, mass-send response, categorize

##### 7.3 Response Templates
- Account issue responses
- Refund decision templates
- Pricing inquiry template
- Technical troubleshooting steps
- Ban appeal procedure
- Booster verification status responses

---

#### 8. NOTIFICATION SYSTEM (Multi-channel)

##### 8.1 Notification Types

| Type | Channels | Timing |
|------|----------|--------|
| Order Status Change | In-app, Email, Push | Instant |
| New Chat Message | In-app, Push | Real-time |
| Payout Processed | Email, SMS (opt-in) | Post-transfer |
| Account Warning | Email, SMS, In-app | Instant |
| Support Response | Email, In-app | Instant |
| Promotion/Campaign | Email, In-app | Batch (48h quiet) |
| Verification Expiration | Email, In-app | 30 days before |

##### 8.2 Notification Preferences
- User-configurable: Email, SMS, Push (per type)
- Quiet hours (9pm - 9am default, customizable)
- Unsubscribe options (per notification type or global opt-out)
- SMS: Opt-in with phone verification
- Push: Enabled by default (user can disable)

##### 8.3 Push Notification Service
- Firebase Cloud Messaging (FCM) for Android
- Apple Push Notification Service (APNs) for iOS
- Web push for desktop (Service Worker)
- Device token management & cleanup (soft-delete inactive tokens)

---

#### 9. RANKING & REVIEW SYSTEM

##### 9.1 Booster Rating
- 5-star system (clients rate boosters post-completion)
- Weighted average: Recent reviews (30-day window) weighted 50%, older reviews 50%
- Minimum 5 reviews for public rating display
- Verified purchase badge (only clients who completed orders can review)
- Review text required (no rating-only)
- Profanity auto-filter + spam detection
- Display: Booster name, avatar, rating, # of reviews, badge, top 3 recent reviews

##### 9.2 Review Moderation
- Auto-flag reviews with extreme keywords (check against profanity list)
- Admin can mark fake/spam reviews (hidden from public)
- Review disputes: Booster can request review removal (flagged for admin review)
- Public response: Boosters can reply to reviews (1 response per review, 500 chars max)

##### 9.3 Booster Leaderboard (Phase 1.1+)
- Sorted by: rating (primary), completion rate, earnings (secondary)
- Filter by game
- Display: Top 100 boosters (public-facing)
- Badge system: Elite (4.8+), Pro (4.5+), Verified (4.0+)

##### 9.4 Completion Rate Calculation (NEW)
- Completion Rate = (Completed Orders) / (Accepted Orders) × 100%
- Used in pricing adjustments, leaderboard ranking, booster dashboard
- Calculated weekly, updated on Sundays

---

## DATA SCHEMA (MONGODB)

### Core Collections with Indexing

```javascript
// ==========================================
// USERS & AUTHENTICATION
// ==========================================

// users collection
{
  _id: ObjectId,
  username: String, // unique
  email: String, // unique
  passwordHash: String,
  avatarUrl: String,
  phone: String,
  phoneVerified: Boolean,
  twoFaEnabled: Boolean,
  twoFaSecret: String,
  role: Enum(['client', 'booster', 'mod', 'admin']),
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date,
  deletedAt: Date, // soft delete
  indexes: {
    email: 1,
    username: 1,
    role: 1,
    createdAt: -1
  }
}

// ==========================================
// BOOSTER PROFILES
// ==========================================

// boosters collection
{
  _id: ObjectId,
  userId: ObjectId, // reference to users
  bio: String,
  totalEarningsLifetime: Decimal128,
  monthlyEarnings: Decimal128,
  currentMonth: String, // YYYY-MM
  rating: Decimal, // 0.0 - 5.0
  reviewCount: Int,
  completionRate: Decimal, // percentage
  verificationStatus: Enum(['pending', 'verified_tier1', 'verified_tier2', 'verified', 'suspended', 'rejected']),
  verificationTier: Int, // 0, 1, 2, 3
  verificationTier3Date: Date, // when Tier 3 was completed
  nextReVerificationDate: Date, // 90 days after Tier 3
  accountActivationStatus: Boolean,
  plusMember: Boolean,
  plusMemberUntil: Date,
  payoutMethod: Enum(['bank_transfer', 'card', 'stripe_connect']),
  payoutBankAccount: {
    accountHolder: String,
    iban: String,
    swiftCode: String
  },
  isSuspended: Boolean,
  suspensionReason: String,
  suspensionDate: Date,
  disputeCount: Int, // lifetime disputes
  chargebackCount: Int, // lifetime chargebacks
  fraudFlags: [String], // array of fraud flags
  createdAt: Date,
  updatedAt: Date,
  indexes: {
    userId: 1,
    verificationStatus: 1,
    rating: -1,
    completionRate: -1,
    createdAt: -1
  }
}

// booster_games collection
{
  _id: ObjectId,
  boosterId: ObjectId,
  gameId: ObjectId,
  gameHandle: String,
  currentRank: String,
  rankVerified: Boolean,
  rankVerifiedAt: Date,
  available: Boolean,
  activeOrdersCount: Int,
  totalCompletedOrders: Int,
  createdAt: Date,
  indexes: {
    boosterId: 1,
    gameId: 1,
    available: 1
  }
}

// ==========================================
// GAMES & RANKS
// ==========================================

// games collection
{
  _id: ObjectId,
  name: String, // 'League of Legends'
  code: String, // 'lol'
  iconUrl: String,
  basePrice: Decimal128,
  apiProvider: String, // 'riot', 'ea', 'valve', etc.
  minAccountAge: Int, // days
  minRank: String, // minimum rank to boost
  createdAt: Date,
  indexes: {
    code: 1
  }
}

// ranks collection
{
  _id: ObjectId,
  gameId: ObjectId,
  name: String, // 'Iron', 'Bronze', etc.
  division: Int, // 4, 3, 2, 1 or 0
  difficultyMultiplier: Decimal,
  rankOrder: Int, // 1-100 for sorting
  createdAt: Date,
  indexes: {
    gameId: 1,
    rankOrder: 1
  }
}

// services collection
{
  _id: ObjectId,
  gameId: ObjectId,
  name: String, // 'Solo', 'Duo'
  code: String, // 'solo', 'duo'
  description: String,
  priceMultiplier: Decimal,
  requiresDuo: Boolean,
  createdAt: Date,
  indexes: {
    gameId: 1,
    code: 1
  }
}

// pricing_config collection (NEW)
{
  _id: ObjectId,
  gameId: ObjectId,
  rankId: ObjectId,
  serviceId: ObjectId,
  baseMultiplier: Decimal,
  adjustments: {
    queueWaitBonus: Decimal, // +% if wait > 2 days
    lowRatingPenalty: Decimal, // -% if rating < 4.0
    newBoosterDiscount: Decimal, // -% for first 10 orders
    peakHourBonus: Decimal // +% for 6pm-2am
  },
  lastModifiedBy: ObjectId, // admin user
  lastModifiedAt: Date,
  createdAt: Date,
  indexes: {
    gameId: 1,
    rankId: 1,
    serviceId: 1
  }
}

// ==========================================
// ORDERS (CORE BUSINESS)
// ==========================================

// orders collection
{
  _id: ObjectId,
  orderNumber: String, // 'ORD-20251225-0001'
  clientId: ObjectId,
  boosterId: ObjectId,
  gameId: ObjectId,
  serviceId: ObjectId,

  // Rank Details
  startRankId: ObjectId,
  endRankId: ObjectId,
  startRankName: String,
  endRankName: String,

  // Pricing
  basePrice: Decimal128,
  serviceMultiplier: Decimal,
  additionalFees: Decimal128,
  totalPrice: Decimal128,
  platformCommission: Decimal128,
  boosterEarnings: Decimal128,

  // Status & Timeline
  status: Enum(['draft', 'submitted', 'in_queue', 'in_progress', 'completed', 'cancelled', 'disputed']),
  submittedAt: Date,
  acceptedAt: Date,
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  estimatedCompletionAt: Date,

  // Payment
  paymentIntentId: String, // Stripe
  paymentStatus: Enum(['pending', 'succeeded', 'failed', 'refunded', 'disputed']),
  paymentMethod: String,
  refundedAt: Date,
  refundPercentage: Decimal,

  // Completion & Dispute
  completionProof: String, // match ID or screenshot URL
  completionNotes: String,
  clientConfirmed: Boolean,
  clientConfirmedAt: Date,
  disputeInitiatedAt: Date,
  disputeReason: String,
  disputeEvidence: String, // URL to evidence
  disputeResolution: String, // refund notes, decision
  disputeResolvedAt: Date,

  // Notes
  clientNotes: String,
  boosterNotes: String,

  createdAt: Date,
  updatedAt: Date,
  indexes: {
    clientId: 1,
    boosterId: 1,
    gameId: 1,
    status: 1,
    createdAt: -1,
    paymentStatus: 1
  }
}

// order_queue collection
{
  _id: ObjectId,
  orderId: ObjectId, // unique
  gameId: ObjectId,
  priority: Int, // 0 = normal, 1 = plus
  position: Int,
  estimatedWaitMinutes: Int,
  addedToQueueAt: Date,
  removedFromQueueAt: Date,
  status: Enum(['waiting', 'assigned', 'removed']),
  assignedBoosterId: ObjectId,
  indexes: {
    orderId: 1,
    gameId: 1,
    priority: -1,
    position: 1,
    status: 1
  }
}

// ==========================================
// CHAT & MESSAGING
// ==========================================

// chat_messages collection
{
  _id: ObjectId,
  orderId: ObjectId,
  senderId: ObjectId,
  receiverId: ObjectId,
  messageText: String,
  attachments: [{
    type: Enum(['image', 'screenshot']),
    url: String,
    size: Int
  }],
  readAt: Date,
  createdAt: Date,
  deletedAt: Date, // soft delete
  indexes: {
    orderId: 1,
    senderId: 1,
    createdAt: -1
  }
}

// ==========================================
// SUPPORT SYSTEM
// ==========================================

// support_tickets collection
{
  _id: ObjectId,
  ticketNumber: String, // 'SUP-20251225-0001'
  clientId: ObjectId,
  orderId: ObjectId,
  subject: String,
  description: String,
  issueType: Enum(['account_access', 'refund_request', 'quality_dispute', 'technical_issue', 'other']),
  priority: Enum(['low', 'normal', 'high', 'urgent']),
  status: Enum(['open', 'in_progress', 'resolved', 'closed']),
  assignedToModId: ObjectId,
  attachments: [{
    url: String,
    size: Int
  }],
  resolutionNotes: String,
  createdAt: Date,
  updatedAt: Date,
  resolvedAt: Date,
  closedAt: Date,
  firstResponseAt: Date, // for SLA tracking
  indexes: {
    clientId: 1,
    status: 1,
    priority: -1,
    createdAt: -1,
    assignedToModId: 1
  }
}

// support_ticket_replies collection
{
  _id: ObjectId,
  ticketId: ObjectId,
  repliedBy: ObjectId, // admin/mod user ID
  replyText: String,
  attachments: [{
    url: String,
    size: Int
  }],
  isInternal: Boolean, // internal note (not visible to client)
  createdAt: Date,
  indexes: {
    ticketId: 1,
    createdAt: 1
  }
}

// ==========================================
// REVIEWS & RATINGS
// ==========================================

// booster_reviews collection
{
  _id: ObjectId,
  boosterId: ObjectId,
  clientId: ObjectId,
  orderId: ObjectId, // unique
  rating: Int, // 1-5
  reviewText: String,
  verifiedPurchase: Boolean,
  isFlagged: Boolean,
  flagReason: String,
  boosterResponse: String,
  boosterResponseAt: Date,
  createdAt: Date,
  updatedAt: Date,
  indexes: {
    boosterId: 1,
    rating: -1,
    createdAt: -1,
    verifiedPurchase: 1
  }
}

// ==========================================
// PAYMENTS & PAYOUTS
// ==========================================

// payment_transactions collection
{
  _id: ObjectId,
  orderId: ObjectId,
  stripePaymentIntentId: String, // unique
  amount: Decimal128,
  currency: String, // 'USD'
  status: Enum(['succeeded', 'failed', 'pending']),
  paymentMethod: String,
  createdAt: Date,
  updatedAt: Date,
  indexes: {
    orderId: 1,
    status: 1,
    stripePaymentIntentId: 1
  }
}

// payout_transactions collection
{
  _id: ObjectId,
  boosterId: ObjectId,
  stripePayoutId: String, // unique
  amount: Decimal128,
  currency: String,
  status: Enum(['pending', 'paid', 'failed', 'cancelled']),
  holdUntil: Date,
  createdAt: Date,
  paidAt: Date,
  payoutCycle: String, // YYYY-MM-WW
  deductions: [{
    reason: String,
    amount: Decimal128
  }],
  indexes: {
    boosterId: 1,
    status: 1,
    createdAt: -1
  }
}

// ==========================================
// NOTIFICATIONS
// ==========================================

// notifications collection
{
  _id: ObjectId,
  userId: ObjectId,
  type: Enum(['order_status', 'message', 'payout', 'warning', 'support', 'promo', 'verification']),
  title: String,
  body: String,
  relatedEntityType: String, // 'order', 'ticket'
  relatedEntityId: ObjectId,
  readAt: Date,
  createdAt: Date,
  indexes: {
    userId: 1,
    createdAt: -1,
    readAt: 1
  }
}

// user_notification_preferences collection
{
  _id: ObjectId,
  userId: ObjectId, // unique
  notifyEmailOrderStatus: Boolean,
  notifyPushOrderStatus: Boolean,
  notifyPushChat: Boolean,
  notifyEmailChat: Boolean,
  quietHoursStart: String, // HH:mm
  quietHoursEnd: String,
  createdAt: Date,
  updatedAt: Date
}

// ==========================================
// SUBSCRIPTIONS
// ==========================================

// subscriptions collection
{
  _id: ObjectId,
  userId: ObjectId,
  type: Enum(['plus_membership']),
  status: Enum(['active', 'cancelled', 'expired', 'past_due']),
  stripeSubscriptionId: String, // unique
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAt: Date,
  cancelledAt: Date,
  createdAt: Date,
  updatedAt: Date,
  indexes: {
    userId: 1,
    status: 1
  }
}

// ==========================================
// VERIFICATION (TRUST & SAFETY)
// ==========================================

// booster_verification_documents collection
{
  _id: ObjectId,
  boosterId: ObjectId,
  verificationTier: Int, // 1, 2, 3
  documentType: Enum(['id_document', 'selfie', 'rank_screenshot', 'account_proof']),
  documentUrl: String,
  status: Enum(['pending', 'approved', 'rejected']),
  rejectionReason: String,
  verifiedByAdminId: ObjectId,
  verifiedAt: Date,
  createdAt: Date,
  indexes: {
    boosterId: 1,
    verificationTier: 1,
    status: 1,
    createdAt: -1
  }
}

// fraud_flags collection (NEW)
{
  _id: ObjectId,
  userId: ObjectId, // booster or client
  userType: Enum(['booster', 'client']),
  flagType: Enum(['chargeback', 'multiple_disputes', 'unusual_activity', 'account_verification_failed', 'vpn_detected']),
  severity: Enum(['low', 'medium', 'high', 'critical']),
  description: String,
  evidence: String, // reference to order/transaction
  resolved: Boolean,
  resolvedAt: Date,
  action: Enum(['warned', 'suspended', 'investigated']),
  createdAt: Date,
  indexes: {
    userId: 1,
    flagType: 1,
    severity: 1,
    resolved: 1,
    createdAt: -1
  }
}

// ==========================================
// ADMIN & AUDIT
// ==========================================

// admin_activity_logs collection
{
  _id: ObjectId,
  adminId: ObjectId,
  action: String, // 'suspend_booster', 'refund_order', 'adjust_pricing'
  targetType: String, // 'booster', 'order', 'user'
  targetId: ObjectId,
  details: Object, // before/after states
  reason: String,
  createdAt: Date,
  indexes: {
    adminId: 1,
    action: 1,
    createdAt: -1,
    targetId: 1
  }
}

// daily_analytics collection
{
  _id: ObjectId,
  date: Date, // unique
  totalOrdersCount: Int,
  totalRevenue: Decimal128,
  totalPayouts: Decimal128,
  activeBoosters: Int,
  activeClients: Int,
  newBoosters: Int,
  newClients: Int,
  completionRate: Decimal,
  avgCompletionTimeMinutes: Int,
  avgOrderValue: Decimal128,
  chargebackCount: Int,
  disputeCount: Int,
  createdAt: Date,
  indexes: {
    date: -1
  }
}
```

---

## USER ROLES & PERMISSIONS MATRIX

| Feature | Client | Booster | Moderator | Admin |
|---------|--------|---------|-----------|-------|
| Create Order | ✅ | ❌ | ❌ | ❌ |
| View Own Orders | ✅ | ✅ | ❌ | ✅ |
| Accept Order (Queue) | ❌ | ✅ | ❌ | ❌ |
| Update Order Status | ❌ | ✅ | ✅ | ✅ |
| Chat with Booster | ✅ | ✅ | ✅ (read-only override) | ✅ (override) |
| Confirm Completion | ✅ | ❌ | ✅ | ✅ |
| Initiate Dispute | ✅ | ✅ | ❌ | ❌ |
| View Reviews | ✅ | ✅ | ✅ | ✅ |
| Post Review | ✅ (verified purchases) | ❌ | ❌ | ❌ |
| Reply to Review | ❌ | ✅ | ✅ | ✅ |
| Create Support Ticket | ✅ | ✅ | ❌ | ❌ |
| Manage Tickets | ✅ (own) | ❌ | ✅ | ✅ |
| Process Refunds | ❌ | ❌ | ✅ | ✅ |
| Suspend User | ❌ | ❌ | ❌ | ✅ |
| Verify Booster | ❌ | ❌ | ✅ | ✅ |
| View Analytics | ❌ | ❌ | ❌ | ✅ |
| Manage Pricing | ❌ | ❌ | ❌ | ✅ |
| Process Payouts | ❌ | ❌ | ❌ | ✅ |
| View Audit Logs | ❌ | ❌ | ❌ | ✅ |
| Invite Moderators | ❌ | ❌ | ❌ | ✅ |
| Manage Fraud Flags | ❌ | ❌ | ✅ | ✅ |

---

## PAYMENT & PRICING LOGIC

### Pricing Algorithm Detailed Breakdown

**Step 1: Base Rate Calculation**
```javascript
const baseRate = game.basePrice; // $20/hour default for LoL, $22 for Val, $10 for Apex

// Adjust for rank difficulty
const difficultyMultiplier = ranks[endRank].difficultyMultiplier;
const rankAdjustedRate = baseRate * difficultyMultiplier;

// Estimate hours needed
const estimatedHours = calculateHours(startRank, endRank, game);
// Example: Iron to Gold = 12 hours, Gold to Plat = 15 hours

const baseCost = rankAdjustedRate * estimatedHours;
```

**Step 2: Service Multiplier**
```javascript
const serviceMultiplier = services[selectedService].priceMultiplier;
// Solo: 1.0x, Duo: 0.8x (MVP only)

const serviceCost = baseCost * serviceMultiplier;
```

**Step 3: Dynamic Adjustments**
```javascript
let adjustedCost = serviceCost;

// Queue wait time adjustment
if (queueWaitDays > 2) {
  adjustedCost *= 1.10; // +10%
}

// Booster rating adjustment (incentivize highly-rated)
if (boosterRating < 4.0) {
  adjustedCost *= 0.85; // -15%
}

// New booster promotion
if (boosterCompletedOrders < 10) {
  adjustedCost *= 0.80; // -20%
}

// Peak hours (6pm-2am UTC)
const hour = new Date().getUTCHours();
if (hour >= 18 || hour < 2) {
  adjustedCost *= 1.10; // +10% peak pricing
}
```

**Step 4: Commission Split**
```javascript
const platformCommission = adjustedCost * 0.30; // 30% for platform
const boosterEarnings = adjustedCost * 0.70; // 70% for booster

const totalPrice = adjustedCost; // What client pays
```

### Payment Escrow Flow

```
Timeline:
1. Client submits payment (Stripe Checkout)
   ↓
2. Stripe processes, sends `payment_intent.succeeded` webhook
   ↓
3. Backend: Create order, reserve funds in Stripe Connect
   ↓
4. Order moves to "in_queue"
   ↓
5. Booster claims order
   ↓
6. Order moves to "in_progress"
   ↓
7. Booster completes (submits evidence)
   ↓
8. Client confirms completion (or auto-confirm 48h later)
   ↓
9. 48h hold period (chargeback protection)
   ↓
10. Release funds to booster via Stripe Connect payout (weekly)
```

### Refund Policy

| Condition | Timeline | Refund % |
|-----------|----------|----------|
| Booster didn't accept order | 24 hours | 100% |
| Order not started | Within 48h | 100% |
| Quality issue (wrong rank) | Within 7 days | 50-100% (case-by-case) |
| Client cancelled (no reason) | 1 hour max | 100%, booster gets 0% |
| Chargeback from payment processor | Within 180 days | Full investigation, potential suspension |

---

## TRUST & SAFETY FRAMEWORK (NEW)

### Core Pillars

**1. Booster Verification (3-Tier)**
- Automated + manual + gameplay verification
- Quarterly re-verification
- Device fingerprinting to detect reuse

**2. Fraud Detection**
- Chargeback tracking + auto-suspension on pattern
- Unusual order patterns (e.g., $3000 order from new account)
- VPN/proxy detection via IP reputation API
- Multiple account detection (same device ID)

**3. Dispute Resolution**
- Evidence-based (match history, screenshots)
- Admin SLA: 24h for urgent disputes
- Clear decision logging for appeals

**4. Account Security**
- 2FA mandatory for boosters at signup
- Login notifications with device/location info
- IP whitelisting option (Phase 1.1)
- Session timeout: 24h idle

**5. Monitoring & Alerting**
- Real-time fraud alerts to admin dashboard
- Daily audit log exports (compliance)
- Chargeback/dispute rate dashboards
- Anomaly detection: Outlier order values, completion times

### Trust & Safety ClickUp Epic (Phase 1)

- Subtasks: Fraud detection implementation, verification tier 2&3 flows, dispute resolution UI, audit logging, IP reputation integration
- Owner: Backend Lead + Trust & Safety Lead
- Success criteria: 0 major fraud incidents in first 100 orders, <2% chargeback rate

---

## NON-FUNCTIONAL REQUIREMENTS

### Performance

- **Page Load Time:** < 2 seconds (95th percentile)
- **API Response Time:** < 500ms (95th percentile, excluding Stripe/external APIs)
- **Database Query Time:** < 200ms (95th percentile)
- **Chat Latency:** < 100ms (WebSocket message delivery, p99)
- **Uptime SLA:** 99.5% monthly (VPS with failover)
- **Concurrent Users:** 1,000+ simultaneous (MVP target)
- **Load Testing:** Conduct weekly load tests simulating real traffic

### Scalability

- **Horizontal Scaling:** Load balancer (Nginx) with multiple Node.js instances
- **Database:** MongoDB Atlas with connection pooling; sharding for collections >10GB
- **Cache:** Redis for session, rate limits, leaderboard caching
- **CDN:** Cloudflare / AWS CloudFront for static assets
- **Message Queue:** Bull (Redis-backed) for async tasks (emails, notifications, payout processing)
- **VPS Optimization:** Process manager (PM2) with clustering, auto-restart, health checks
- **Auto-scaling Plan:** Horizontal scale to 3+ servers if >80% CPU sustained

### Security

- **Authentication:** JWT tokens (24h expiry), refresh tokens (30d)
- **Password:** bcrypt hashing (salt rounds: 12), strength validation
- **2FA:** TOTP (Google Authenticator, Authy) mandatory for boosters
- **SSL/TLS:** All traffic encrypted (TLS 1.3+), HSTS headers
- **Injection Prevention:** Mongoose schema validation, input sanitization, parameterized queries
- **XSS Protection:** CSP headers, DOMPurify for user content, no innerHTML
- **CSRF Protection:** CSRF tokens on state-changing operations (forms, API)
- **Rate Limiting:** 100 req/min per IP, 1000 req/min per authenticated user
- **DDoS Protection:** Cloudflare WAF + managed rules
- **PCI DSS Compliance:** Never store raw card data (Stripe tokenization), secure webhook handling
- **Dependency Scanning:** GitHub Dependabot enabled, npm audit CI/CD check
- **Security Review:** Quarterly code review for security vulnerabilities

### Data Privacy

- **GDPR Compliance:** Right to deletion, data export, consent management
- **CCPA Compliance:** Privacy policy, opt-out mechanisms, data access
- **Data Retention:** 7-year financial records, 1-year chat archival, 90-day backup retention
- **Encryption at Rest:** Field-level encryption for sensitive data (bcrypt, AES for PII)
- **Encryption in Transit:** TLS 1.3+, secure WebSocket (WSS)
- **PII Masking:** Mask email, phone in logs and admin views
- **Data Export:** User can export their data (GDPR right to data portability)

### Monitoring & Logging

- **Application Monitoring:** Sentry for error tracking + alerts
- **Performance Monitoring:** PM2 Plus, Grafana dashboards
- **Log Aggregation:** ELK Stack (single VPS or cloud) with 90-day retention
- **Health Checks:** Custom health endpoint every 60s, metrics exposed for Prometheus
- **Alerting:** Discord/Slack webhooks for critical alerts (errors >100/min, downtime, payment failures)
- **Audit Logs:** All admin actions logged (user, action, timestamp, details), queryable and exportable
- **Database Monitoring:** Slow query log (>200ms), connection pool monitoring, disk space alerts

---

## TECHNICAL ARCHITECTURE

### High-Level System Design

```
┌─────────────┐
│   Browser   │ ◄─────────┐
│ (React App) │           │
└──────┬──────┘           │
       │                  │
       │ HTTPS/WebSocket  │
       ▼                  │
┌──────────────────────┐  │
│  CDN (Cloudflare)    │──┤
│  Static Assets       │  │
└──────────────────────┘  │
                          │
       ┌──────────────────┴──────────┐
       │                             │
       ▼                             ▼
┌─────────────────────┐      ┌──────────────────┐
│  React Frontend     │      │ WebSocket Server │
│  (Vite/Create-React)      │ (Socket.io)      │
│  Port 3000          │      │ Port 3001        │
└──────────┬──────────┘      └────────┬─────────┘
           │                          │
           │   REST API (JSON)        │ Real-time
           │                          │
           └──────────────┬───────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
    ┌──────────────┐            ┌──────────────────────┐
    │ Express.js   │            │ Node.js Services     │
    │ API Server   │            │ (Bull Job Queue)     │
    │ (Port 5000)  │            │ - Email jobs         │
    │              │            │ - SMS notifications  │
    │ (VPS hosted) │            │ - Background tasks   │
    └────┬─────────┘            └──────────┬───────────┘
         │                                 │
         └────────────┬────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
        ▼                            ▼
    ┌──────────────┐        ┌──────────────┐
    │ MongoDB      │        │ Redis Cache  │
    │ (Atlas/VPS)  │        │ (VPS)        │
    │              │        │              │
    │ Database     │        │ Session      │
    │ Documents    │        │ Leaderboard  │
    └──────────────┘        └──────────────┘
        │
        ├─ Stripe API (Payment Processing)
        ├─ OAuth Providers (Discord, Google)
        ├─ Game APIs (Riot, EA, Valve, NetEase)
        └─ SendGrid / Twilio (Email, SMS)

┌──────────────────────────────────┐
│ Electron Desktop App (Phase 3)    │
│ (Boosters - Optional Premium)     │
│ - Shared React components         │
│ - Native notifications            │
│ - Auto-updates                    │
└──────────────────────────────────┘
```

### Technology Stack (MERN)

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Socket.io Client |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB (Atlas or self-hosted), Mongoose ODM |
| Cache | Redis 7+ (session, leaderboard) |
| Real-time | Socket.io (WebSocket + fallback polling) |
| Authentication | JWT, Passport.js, TOTP (speakeasy) |
| Payments | Stripe API, Stripe Connect |
| File Storage | AWS S3 / Cloudinary / MinIO (self-hosted) |
| Email/SMS | SendGrid, Twilio |
| Job Queue | Bull (Redis-backed) |
| Hosting | VPS (AWS EC2, DigitalOcean, Linode, Verpex) |
| Process Manager | PM2 with clustering & monitoring |
| Reverse Proxy | Nginx |
| CI/CD | GitHub Actions, Docker (containerized) |
| Monitoring | Sentry, PM2 Plus, Grafana, ELK Stack |
| Desktop (Phase 3) | Electron + React (code sharing), electron-updater |

### VPS Infrastructure Setup

**Single VPS Server Configuration (Recommended for MVP):**

```
Ubuntu 22.04 LTS
├── Nginx (reverse proxy, load balancing)
├── Node.js v20 LTS (backend)
├── React app (built SPA, served by Nginx)
├── MongoDB 6.0+ (local or managed)
├── Redis 7+ (caching)
├── PM2 (process manager + monitoring)
├── SSL/TLS (Let's Encrypt, auto-renew)
├── Firewall (UFW rules, open only 80, 443, 22)
└── Monitoring (Prometheus + Grafana, optional)

Recommended Specs:
- CPU: 4+ cores (t3.medium or higher)
- RAM: 8GB+ (for MongoDB + Node + Redis)
- Storage: 100GB SSD
- Bandwidth: Unmetered
- Regions: US, EU for optimal latency
```

**Multi-VPS High-Availability (Post-MVP, Phase 1.1+):**

```
Load Balancer (Nginx/AWS LB)
├── VPS 1 (API Server 1 + Socket.io)
├── VPS 2 (API Server 2 + Socket.io)
├── VPS 3 (API Server 3 + Socket.io)
├── Database (MongoDB Atlas or managed)
└── Cache (Redis Cluster)
```

### Environment Configuration (VPS)

```bash
# .env.production
NODE_ENV=production
PORT=5000
API_URL=https://api.gamingboost.com

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/gamingboost
MONGODB_POOL_SIZE=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=<strong-password>

# JWT
JWT_SECRET=<random-256-bit-key>
JWT_REFRESH_SECRET=<random-256-bit-key>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Game APIs
RIOT_API_KEY=<from-dev.leagueoflegends.com>
EA_API_KEY=<for-apex>
VALVE_CSGO_API_KEY=<for-csgo>

# OAuth
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Email & SMS
SENDGRID_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# File Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=gamingboost-uploads

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...

# VPS Monitoring
PM2_PLUS_API_KEY=...
SENTRY_DSN=...

# Frontend (React)
REACT_APP_API_URL=https://api.gamingboost.com
REACT_APP_WS_URL=wss://api.gamingboost.com
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## FINAL CHECKLIST BEFORE START

**Before Day 1 of Development:**

- [ ] BRD v3.0 signed off by all stakeholders
- [ ] ClickUp workspace created with all phases, epics, tasks
- [ ] GitHub repos created (frontend, backend)
- [ ] VPS provisioned & security configured
- [ ] All third-party API keys collected (Stripe, Riot, SendGrid, etc.)
- [ ] CI/CD pipeline setup & tested
- [ ] Team trained on ClickUp, GitHub, deployment process
- [ ] Monitoring & alerting configured
- [ ] Daily standup scheduled (same time, every weekday)
- [ ] Weekly sprint reviews scheduled (Friday)
- [ ] Product reviews scheduled (Wednesday)
- [ ] On-call rotation for Week 9+ launch

**Success Metrics (Target Year 1):**
- Launch MVP in 11 weeks ✅
- Zero critical bugs in first week ✅
- <0.5% error rate on production ✅
- 200+ verified boosters ✅
- 50+ orders/week by Week 16 ✅
- $10K MRR by Week 26 ✅
- Net promoter score (NPS) > 50 ✅