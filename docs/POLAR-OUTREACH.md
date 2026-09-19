# Polar outreach (founder ops)

Before relying on Polar for production checkout, send them an honest description and keep the written reply.

## Suggested email

**Subject:** Use-case review — gaming ranked boosting (human fulfillment)

Hi Polar team,

We’re building HardStuck, a matched-pool ranked boosting platform (League of Legends and Valorant). Customers pay us for Solo/Duo boosts; we assign verified contractors (boosters) and pay them ourselves. We would be the merchant; boosters are not separate Polar sellers.

Fulfillment is human gameplay (not a downloadable digital good). We disclose to customers and boosters that this may violate publisher Terms of Service and carries account risk.

We’d like to use Polar Checkout + webhooks for client payments (organization payouts to Egypt), with an internal escrow ledger for booster release. Can you confirm whether this use case is allowed under your Acceptable Use Policy, or if it will be rejected at account review?

Happy to share a staging URL and product copy once available.

Thanks,  
[Name]  
HardStuck

## If they say no

1. Soft-launch with `PAYMENT_PROVIDER=manual`  
2. Proceed toward US entity + Stripe (Phase 7) before scaling paid ads  

## If they say yes

Keep the approval email. Wire Phase 3 Polar adapter. Re-check if product scope expands (accounts marketplace, etc.).
