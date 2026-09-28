/**
 * Demo: LoL client order → offer + live SSE for LoL-assigned booster.
 *
 * Usage (from apps/web, dev server must be running for `auto`):
 *   pnpm exec tsx --env-file=.env scripts/demo-lol-offer-notification.ts auto
 *   pnpm exec tsx --env-file=.env scripts/demo-lol-offer-notification.ts setup
 *   pnpm exec tsx --env-file=.env scripts/demo-lol-offer-notification.ts pay <orderId>
 */
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { quotePrice } from "@hardstuck/shared";
import type { BoosterLiveOfferPayload } from "../src/lib/booster-live-events";
import { auth } from "../src/server/auth";
import { getDb } from "../src/server/db";
import {
  boosterProfiles,
  orderOffers,
  orders,
  user,
} from "../src/server/db/schema";
import { fulfillOrderPayment } from "../src/server/orders/fulfill-payment";

const CLIENT_EMAIL = "demo-lol-client@hardstuck.local";
const CLIENT_PASSWORD = "ClientPass123!";
const BOOSTER_EMAIL = "demo-lol-booster@hardstuck.local";
const BOOSTER_PASSWORD = "BoosterPass123!";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function cookiesFromResponse(res: Response): string {
  const getSetCookie = (
    res.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie?.bind(res.headers);
  const parts = getSetCookie?.() ?? [];
  if (parts.length > 0) {
    return parts.map((c) => c.split(";")[0]).join("; ");
  }
  const single = res.headers.get("set-cookie");
  return single ? single.split(";")[0]! : "";
}

async function signInHttp(email: string, password: string): Promise<string> {
  const base = appUrl();
  const res = await fetch(`${base}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: base,
      Referer: `${base}/login`,
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sign-in failed for ${email}: ${res.status} ${text}`);
  }
  const cookie = cookiesFromResponse(res);
  if (!cookie) {
    throw new Error(`Sign-in for ${email} returned no session cookie`);
  }
  return cookie;
}

function parseSseOffer(buffer: string): BoosterLiveOfferPayload | null {
  const blocks = buffer.split("\n\n");
  for (const block of blocks) {
    if (!block.includes("event: offer")) continue;
    const dataLine = block
      .split("\n")
      .find((l) => l.startsWith("data: "));
    if (!dataLine) continue;
    try {
      const payload = JSON.parse(dataLine.slice(6)) as BoosterLiveOfferPayload;
      if (payload.type === "offer.new") return payload;
    } catch {
      /* skip */
    }
  }
  return null;
}

async function waitForLiveOffer(
  boosterCookie: string,
  timeoutMs: number,
): Promise<BoosterLiveOfferPayload> {
  const base = appUrl();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch(`${base}/api/booster/live`, {
      headers: { Cookie: boosterCookie },
      signal: ac.signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`SSE connect failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const offer = parseSseOffer(buffer);
      if (offer) {
        ac.abort();
        return offer;
      }
    }
    throw new Error("SSE stream ended before offer event");
  } finally {
    clearTimeout(timer);
  }
}

async function payOrderHttp(orderId: string, clientCookie: string) {
  const base = appUrl();
  const res = await fetch(`${base}/api/orders/${orderId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: clientCookie,
    },
    body: JSON.stringify({ action: "pay" }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pay failed: ${res.status} ${text}`);
  }
}

async function upsertUser(opts: {
  email: string;
  password: string;
  name: string;
  role: "client" | "booster";
}) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.email, opts.email))
    .limit(1);

  if (existing) {
    await db
      .update(user)
      .set({ role: opts.role, name: opts.name, updatedAt: new Date() })
      .where(eq(user.id, existing.id));
    return existing.id;
  }

  const result = await auth.api.signUpEmail({
    body: {
      email: opts.email,
      password: opts.password,
      name: opts.name,
      role: opts.role,
    },
  });
  if (!result?.user) throw new Error(`Sign up failed for ${opts.email}`);
  return result.user.id;
}

async function ensureLolBooster(boosterUserId: string) {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(boosterProfiles)
    .where(eq(boosterProfiles.userId, boosterUserId))
    .limit(1);

  if (profile) {
    await db
      .update(boosterProfiles)
      .set({
        status: "approved",
        games: ["lol"],
        updatedAt: new Date(),
      })
      .where(eq(boosterProfiles.userId, boosterUserId));
    return;
  }

  await db.insert(boosterProfiles).values({
    userId: boosterUserId,
    status: "approved",
    games: ["lol"],
    invitedByCode: "DEMO",
  });
}

async function createLolOrder(clientUserId: string) {
  const eurPerUsd = Number(process.env.EUR_PER_USD ?? "0.92");
  const input = {
    game: "lol" as const,
    serviceType: "solo" as const,
    startRankKey: "iron_iv",
    endRankKey: "silver_iv",
    server: "euw",
    queue: "solo",
    addOnKeys: [] as string[],
    displayCurrency: "USD" as const,
    eurPerUsd,
    riskDisclosureAccepted: true as const,
  };
  const quote = quotePrice(input);
  if (!quote.ok) throw new Error(quote.error);

  const db = getDb();
  const [order] = await db
    .insert(orders)
    .values({
      clientUserId,
      status: "awaiting_payment",
      game: quote.game,
      serviceType: quote.serviceType,
      skuSlug: quote.skuSlug,
      skuPayload: {},
      startRankKey: quote.startRankKey,
      endRankKey: quote.endRankKey,
      server: input.server,
      queue: input.queue,
      addOnKeys: [],
      amountUsdCents: quote.amountUsdCents,
      amountEurCents: quote.amountEurCents,
      contractorShareUsdCents: quote.contractorShareUsdCents,
      currency: "USD",
      divisions: quote.divisions,
      riskDisclosureAcceptedAt: new Date(),
    })
    .returning();

  return order!;
}

async function payOrderDb(orderId: string) {
  await fulfillOrderPayment({
    orderId,
    provider: "manual",
    providerPaymentId: `manual_${randomUUID()}`,
    providerEventId: `demo_pay_${orderId}_${Date.now()}`,
  });
}

async function verifyBoosterOffer(orderId: string) {
  const db = getDb();
  const [booster] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, BOOSTER_EMAIL))
    .limit(1);
  if (!booster) throw new Error("Booster missing");

  return db
    .select()
    .from(orderOffers)
    .where(
      and(
        eq(orderOffers.orderId, orderId),
        eq(orderOffers.boosterUserId, booster.id),
        eq(orderOffers.status, "pending"),
      ),
    );
}

async function ensureDemoUsers() {
  const clientId = await upsertUser({
    email: CLIENT_EMAIL,
    password: CLIENT_PASSWORD,
    name: "LoL Demo Client",
    role: "client",
  });
  const boosterId = await upsertUser({
    email: BOOSTER_EMAIL,
    password: BOOSTER_PASSWORD,
    name: "LoL Demo Booster",
    role: "booster",
  });
  await ensureLolBooster(boosterId);
  return { clientId, boosterId };
}

async function runAuto() {
  const base = appUrl();
  console.log("=== LoL demo (automatic) ===");
  console.log("App URL:", base);

  const health = await fetch(`${base}/api/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(
      `Dev server not reachable at ${base}. Start with: pnpm dev`,
    );
  }

  const { clientId } = await ensureDemoUsers();
  const order = await createLolOrder(clientId);
  console.log("Order created:", order.id, order.game, order.startRankKey, "→", order.endRankKey);

  console.log("Signing in booster (SSE listener)…");
  const boosterCookie = await signInHttp(BOOSTER_EMAIL, BOOSTER_PASSWORD);
  const livePromise = waitForLiveOffer(boosterCookie, 20_000);

  console.log("Signing in client and paying order…");
  const clientCookie = await signInHttp(CLIENT_EMAIL, CLIENT_PASSWORD);
  await payOrderHttp(order.id, clientCookie);

  console.log("Waiting for live SSE offer event…");
  const live = await livePromise;
  const offers = await verifyBoosterOffer(order.id);

  console.log("");
  console.log("=== Results ===");
  console.log("DB pending offer for LoL booster:", offers.length > 0 ? "YES" : "NO");
  console.log("Live SSE offer received:", live.order.id === order.id ? "YES" : "NO");
  console.log("Offer id:", live.offer.id);
  console.log("Game:", live.order.game, "·", live.order.serviceType);
  console.log("");
  console.log("Booster login:", BOOSTER_EMAIL, BOOSTER_PASSWORD);
  console.log("Open:", `${base}/booster`);
}

async function setup() {
  const { clientId } = await ensureDemoUsers();
  const order = await createLolOrder(clientId);

  console.log("=== Demo LoL offer flow (setup) ===");
  console.log("Client login:", CLIENT_EMAIL, CLIENT_PASSWORD);
  console.log("Booster login:", BOOSTER_EMAIL, BOOSTER_PASSWORD);
  console.log("Order id (awaiting payment):", order.id);
  console.log("Run: pnpm exec tsx --env-file=.env scripts/demo-lol-offer-notification.ts pay", order.id);
}

async function payAndVerify(orderId: string) {
  await payOrderDb(orderId);
  const offers = await verifyBoosterOffer(orderId);
  console.log("=== Payment fulfilled (direct DB) ===");
  console.log("Pending offer for LoL booster:", offers.length > 0 ? "YES" : "NO");
  if (offers[0]) console.log("Offer id:", offers[0].id);
  console.log(
    "Note: live browser toast requires pay via HTTP (use `auto`) while dev server runs.",
  );
}

async function main() {
  const cmd = process.argv[2] ?? "auto";
  if (cmd === "auto") {
    await runAuto();
    return;
  }
  if (cmd === "setup") {
    await setup();
    return;
  }
  if (cmd === "pay") {
    const orderId = process.argv[3];
    if (!orderId) throw new Error("Pass order id");
    await payAndVerify(orderId);
    return;
  }
  throw new Error(`Unknown command: ${cmd}. Use auto | setup | pay`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
