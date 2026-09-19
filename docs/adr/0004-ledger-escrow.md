# Escrow is an internal ledger, not a PSP feature

After Client payment succeeds, funds are platform liability until Order completion and release rules pass. Booster payouts are Payoneer/Wise (admin-operated) from released balances. Stripe Connect split balances are optional later, not MVP.

**Release rules (accepted):** Client confirms → 48h hold → release to Booster payable. If Client is silent 48h after Booster marks delivered, auto-complete then same hold. Disputes freeze release.

**Why:** Polar/Stripe MoR paths pay the organization, not each Booster. Modeling escrow in Order + Ledger keeps PaymentPort swappable and matches platform-principal (ADR 0001).
