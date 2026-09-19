# Account marketplace with platform escrow

HardStuck sells game accounts as a **sibling product** to matched-pool boosting. Buyers purchase a specific listing; sellers are KYC'd contractors; HardStuck remains merchant of record and holds escrow until the buyer confirms credential transfer.

**Considered:** bolt-on flag on boost orders; open peer-to-peer without platform MoR; platform-owned inventory only.

**Why:** Account sales need listing browse, seller KYC, warranties/disputes, and a different fulfillment path (no claim queue). Platform escrow reuses ledger semantics and PaymentPort while isolating liability from Solo/Duo climbs (ADR 0001).

**Consequences:**
- New tables: `seller_profiles`, `account_listings`, `account_sales` (+ optional sale vault)
- Seller share **80%** (`SELLER_SHARE_BPS`); platform **20%**
- Boost orders stay matched-pool; accounts never use offer assignment
- Credential handoff reuses vault crypto with wipe after sale completion
