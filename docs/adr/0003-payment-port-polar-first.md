# PaymentPort with Polar first; Stripe after US entity

Client checkout goes through a `PaymentPort` interface. The first adapter is Polar (Egypt-friendly MoR payouts). Lemon Squeezy is rejected (prohibits services of any kind). When the business is profitable, form a US entity (e.g. Stripe Atlas) and add a Stripe adapter behind the same port.

**Considered:** Paymob only; Lemon Squeezy; Stripe Connect from day one; building without an adapter.

**Why:** Egypt cannot open Stripe Payments directly; Polar supports Egypt payouts. Polar (and most MoRs) are category-risk for human boosting — so we ask Polar in writing before relying on them, keep a manual “mark paid” soft-launch path, and never couple Order/Ledger code to one PSP.

**Consequences:** Polar is checkout into the *platform* balance, not per-booster Connect escrow. Escrow truth is our ledger (ADR 0004). Always get written Polar approval for the use case; Plan B is soft-launch manual payment then US entity + Stripe.
