# Polar checkout (Phase 3)

## Dashboard setup
1. Get written AUP approval (`docs/POLAR-OUTREACH.md`).
2. Create an **Organization Access Token** → `POLAR_ACCESS_TOKEN`.
3. Create a product with **custom / pay-what-you-want style pricing** (amount set at checkout) → copy ID → `POLAR_PRODUCT_ID`.
4. Add webhook endpoint: `https://<host>/api/webhooks/polar`
   - Subscribe at least to **order.paid** (and order.refunded if available).
   - Copy signing secret → `POLAR_WEBHOOK_SECRET`.
5. Set `PAYMENT_PROVIDER=polar` and `POLAR_SERVER=sandbox` while testing.

## Local tunnel
Use ngrok / Cloudflare tunnel so Polar can reach your webhook.

## Soft-launch fallback
Keep `Simulate pay (dev)` on the order page, or `PAYMENT_PROVIDER=manual`.
