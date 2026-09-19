# Multi-SKU quote model

Matched-pool products are no longer rank-climb-only. Pricing dispatches on `SkuKind`: `rank_climb`, `unit_farm`, `progress_band`, `fixed_package`.

**Why:** Specialty farms (Lord, weapon CP), level bands, and fixed unlocks share checkout/assignment/vault with climbs but need different quote math. Config lives in `packages/shared` (`skus.ts` + `catalog.ts`) — not per-game forks.

**Consequences:** Orders carry `skuSlug` + `skuPayload`; calculator exposes SKU tabs; contractor share is **75%** on release (`CONTRACTOR_SHARE_BPS`).
