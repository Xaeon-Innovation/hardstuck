# HardStuck

HardStuck is a matched-pool ranked boosting platform: clients buy a boost goal; the platform assigns a verified booster and acts as the merchant of record for the order. HardStuck also runs an escrowed **account marketplace** as a sibling product.

## Language

**Client**:
A person who purchases a boost or account. Not a marketplace seller.
_Avoid_: Buyer, customer (in product copy prefer Client), user (when role matters)

**Booster**:
A verified contractor who fulfills boosts after platform assignment. Not an open-marketplace seller in MVP.
_Avoid_: Seller, freelancers (as the product noun), player

**Seller**:
A KYC'd contractor who lists game accounts for sale. May also be a Booster.
_Avoid_: Marketplace vendor (as the only term), storefront owner

**Listing**:
A Seller-created account offer (game, rank/skins summary, price, region) awaiting or live in the shelf.
_Avoid_: Product card, SKU (boost SKUs are separate)

**Account sale**:
An escrowed purchase of a Listing; credentials transfer via vault; Seller share releases after Client confirm.
_Avoid_: Boost order, matched-pool assignment

**Order**:
A paid engagement to move a game account from a current rank state to a desired rank state under chosen options (e.g. Solo or Duo), or a specialty SKU (farm / level / unlock).
_Avoid_: Purchase, booking, ticket (support tickets are separate)

**Matched pool**:
Fulfillment model where the platform assigns an eligible Booster to an Order; Clients do not browse and pick sellers for MVP boosting.
_Avoid_: Marketplace (for MVP boosting), open listing, auction

**Solo**:
Service type where the Booster plays on the Client's account credentials.
_Avoid_: Account share (as the service name), piloting (unless explaining)

**Duo**:
Service type where the Booster queues with the Client on a separate account.
_Avoid_: Duo queue (as the only term — Duo is fine), co-op

**Platform principal**:
HardStuck is the merchant facing the Client for boost Orders and account sales; Boosters/Sellers are paid as contractors by the platform, not as separate checkout merchants in MVP.
_Avoid_: Marketplace intermediary (for MVP), pass-through seller

**Risk disclosure**:
Explicit notice that boosting can violate publisher Terms of Service and may risk account sanctions; shown to Clients and Boosters.
_Avoid_: Guaranteed safe, ban-proof, official partner claims

**Escrow (ledger)**:
Platform-held Order/sale liability after Client payment and before Booster/Seller payout release; the source of truth is HardStuck's state machine, not the payment provider's balance split.
_Avoid_: Stripe Connect escrow (as MVP requirement), Polar escrow

**Payout**:
Transfer of released Booster/Seller earnings via Payoneer or Wise (USDT optional later). Contractor share **75%** on boosts; Seller share **80%** on accounts.
_Avoid_: Instant Connect transfer (MVP), automatic daily bank rails as the only path

**Credential vault**:
Encrypted Solo login secrets (and account-sale handoff) stored for the assigned party and support only; access is audited; wiped per retention policy after completion unless a dispute is open.
_Avoid_: Plaintext passwords, chat-only secrets as the system of record

**Claim queue**:
Eligible Boosters are offered an Order (auto-suggest) and must accept within a time window; otherwise the Order requeues. First successful accept wins.
_Avoid_: Client-picked Booster (MVP), pure first-click with no accept window

**Release hold**:
Period after Client confirmation (or auto-complete) before Booster earnings become payable; disputes freeze release.
_Avoid_: Instant payout on deliver
