/**
 * Seed N paid LoL orders with pending pool offers for the demo booster.
 *
 *   pnpm exec tsx --env-file=.env scripts/seed-booster-queue.ts
 *   pnpm exec tsx --env-file=.env scripts/seed-booster-queue.ts 5
 */
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { quotePrice } from "@hardstuck/shared";
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

const RANK_PAIRS: [string, string][] = [
  ["iron_iv", "bronze_iv"],
  ["bronze_iv", "silver_iv"],
  ["silver_iv", "gold_iv"],
  ["gold_iv", "platinum_iv"],
  ["iron_iii", "bronze_ii"],
];

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
        queueOnline: true,
        updatedAt: new Date(),
      })
      .where(eq(boosterProfiles.userId, boosterUserId));
    return;
  }

  await db.insert(boosterProfiles).values({
    userId: boosterUserId,
    status: "approved",
    games: ["lol"],
    queueOnline: true,
    invitedByCode: "DEMO",
  });
}

async function createAndPayOrder(
  clientUserId: string,
  startRankKey: string,
  endRankKey: string,
) {
  const eurPerUsd = Number(process.env.EUR_PER_USD ?? "0.92");
  const input = {
    game: "lol" as const,
    serviceType: "solo" as const,
    startRankKey,
    endRankKey,
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

  await fulfillOrderPayment({
    orderId: order!.id,
    provider: "manual",
    providerPaymentId: `manual_${randomUUID()}`,
    providerEventId: `seed_queue_${order!.id}_${Date.now()}_${randomUUID()}`,
  });

  return order!;
}

async function main() {
  const count = Math.min(
    10,
    Math.max(1, Number.parseInt(process.argv[2] ?? "5", 10) || 5),
  );
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

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

  console.log(`=== Seeding ${count} queue offers (LoL) ===`);

  const created: string[] = [];
  for (let i = 0; i < count; i++) {
    const [start, end] = RANK_PAIRS[i % RANK_PAIRS.length]!;
    const order = await createAndPayOrder(clientId, start, end);
    created.push(order.id);
    console.log(
      `${i + 1}. ${order.id} · ${start} → ${end} · $${(order.amountUsdCents / 100).toFixed(2)}`,
    );
  }

  const db = getDb();
  const pending = await db
    .select()
    .from(orderOffers)
    .where(
      and(
        eq(orderOffers.boosterUserId, boosterId),
        eq(orderOffers.status, "pending"),
      ),
    );

  console.log("");
  console.log("Pending offers for demo booster:", pending.length);
  console.log("Booster:", BOOSTER_EMAIL, BOOSTER_PASSWORD);
  console.log("Open:", `${base}/notifications`);
  console.log("Tip: stay Online (green) on the desk to see Available tab.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
