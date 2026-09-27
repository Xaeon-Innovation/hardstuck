import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { orderOffers, orders, user } from "@/server/db/schema";
import { postBoosterAssignedWelcome } from "@/server/chat/service";
import { notifyOrderEvent } from "@/server/notifications/email";
import {
  publishAdminLiveOffer,
  publishBoosterLiveEvent,
} from "@/server/notifications/booster-live";
import { listApprovedBoosterIdsForGame } from "@/server/trust/service";
import { OFFER_TTL_MS } from "./transitions";
import { transitionOrder } from "./service";

/** Max concurrent assigned + in-progress orders per booster. */
export const BOOSTER_MAX_ACTIVE_ORDERS = 3;

export async function countActiveBoosterOrders(boosterUserId: string) {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.boosterUserId, boosterUserId),
        inArray(orders.status, ["assigned", "in_progress"]),
      ),
    );
  return Number(row?.n ?? 0);
}

export async function boosterCanAcceptMoreOrders(boosterUserId: string) {
  const active = await countActiveBoosterOrders(boosterUserId);
  return active < BOOSTER_MAX_ACTIVE_ORDERS;
}

/**
 * Hybrid assignment: offer paid orders to verified boosters only.
 * First accept wins; otherwise expire and requeue.
 */
export async function createOffersForOrder(orderId: string, limit = 5) {
  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order || (order.status !== "paid" && order.status !== "expired_offer")) {
    throw new Error("Order not eligible for offers");
  }

  const approvedIds = await listApprovedBoosterIdsForGame(order.game, limit * 2);
  const eligibleIds: string[] = [];
  for (const id of approvedIds) {
    if (await boosterCanAcceptMoreOrders(id)) eligibleIds.push(id);
    if (eligibleIds.length >= limit) break;
  }
  if (eligibleIds.length === 0) {
    return { offered: 0 };
  }

  const boosters = await db
    .select()
    .from(user)
    .where(and(eq(user.role, "booster"), inArray(user.id, eligibleIds)))
    .limit(limit);

  if (boosters.length === 0) {
    return { offered: 0 };
  }

  const expiresAt = new Date(Date.now() + OFFER_TTL_MS);
  const insertedOffers = await db
    .insert(orderOffers)
    .values(
      boosters.map((b) => ({
        orderId,
        boosterUserId: b.id,
        expiresAt,
        status: "pending" as const,
      })),
    )
    .returning();

  await transitionOrder(orderId, "offered", {
    offeredAt: new Date(),
    offerExpiresAt: expiresAt,
  });

  const orderSummary = {
    id: order.id,
    game: order.game,
    serviceType: order.serviceType,
    startRankKey: order.startRankKey,
    endRankKey: order.endRankKey,
    server: order.server,
    amountUsdCents: order.amountUsdCents,
  };

  for (const b of boosters) {
    await notifyOrderEvent({
      toUserId: b.id,
      orderId,
      event: "order_offered",
    });
  }

  const livePayload = {
    type: "offer.new" as const,
    offer: { id: "", expiresAt: "" },
    order: orderSummary,
  };

  for (const offer of insertedOffers) {
    const payload = {
      ...livePayload,
      offer: {
        id: offer.id,
        expiresAt: offer.expiresAt.toISOString(),
      },
    };
    publishBoosterLiveEvent(offer.boosterUserId, payload);
    publishAdminLiveOffer(payload);
  }

  return { offered: boosters.length, expiresAt };
}

export async function acceptOffer(offerId: string, boosterUserId: string) {
  const db = getDb();
  const [offer] = await db
    .select()
    .from(orderOffers)
    .where(eq(orderOffers.id, offerId))
    .limit(1);

  if (!offer || offer.boosterUserId !== boosterUserId) {
    throw new Error("Offer not found");
  }
  if (offer.status !== "pending") {
    throw new Error("Offer is no longer pending");
  }
  if (offer.expiresAt.getTime() < Date.now()) {
    await db
      .update(orderOffers)
      .set({ status: "expired", respondedAt: new Date() })
      .where(eq(orderOffers.id, offerId));
    throw new Error("Offer expired");
  }

  const activeCount = await countActiveBoosterOrders(boosterUserId);
  if (activeCount >= BOOSTER_MAX_ACTIVE_ORDERS) {
    throw new Error(
      `Active order limit reached (${BOOSTER_MAX_ACTIVE_ORDERS}). Deliver or complete one before accepting another.`,
    );
  }

  await db
    .update(orderOffers)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(eq(orderOffers.id, offerId));

  await db
    .update(orderOffers)
    .set({ status: "expired", respondedAt: new Date() })
    .where(
      and(
        eq(orderOffers.orderId, offer.orderId),
        eq(orderOffers.status, "pending"),
      ),
    );

  await transitionOrder(offer.orderId, "assigned", {
    boosterUserId,
    assignedAt: new Date(),
  });

  const [assigned] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, offer.orderId))
    .limit(1);
  if (assigned) {
    await postBoosterAssignedWelcome({
      orderId: assigned.id,
      boosterUserId,
    });
    await notifyOrderEvent({
      toUserId: assigned.clientUserId,
      orderId: assigned.id,
      event: "order_assigned",
    });
  }

  return offer.orderId;
}

export async function expireOpenOffers(orderId: string) {
  const db = getDb();
  await db
    .update(orderOffers)
    .set({ status: "expired", respondedAt: new Date() })
    .where(
      and(eq(orderOffers.orderId, orderId), eq(orderOffers.status, "pending")),
    );

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (order?.status === "offered") {
    await transitionOrder(orderId, "expired_offer");
  }
}

export async function listOpenOffersForBooster(boosterUserId: string) {
  const db = getDb();
  const offers = await db
    .select({
      offer: orderOffers,
      order: orders,
    })
    .from(orderOffers)
    .innerJoin(orders, eq(orderOffers.orderId, orders.id))
    .where(
      and(
        eq(orderOffers.boosterUserId, boosterUserId),
        eq(orderOffers.status, "pending"),
        inArray(orders.status, ["offered"]),
      ),
    );
  return offers.filter((row) => row.offer.expiresAt.getTime() > Date.now());
}

/** All pending pool offers (admin oversight). */
export async function listAllOpenOffers(limit = 100) {
  const db = getDb();
  const offers = await db
    .select({
      offer: orderOffers,
      order: orders,
    })
    .from(orderOffers)
    .innerJoin(orders, eq(orderOffers.orderId, orders.id))
    .where(
      and(eq(orderOffers.status, "pending"), inArray(orders.status, ["offered"])),
    )
    .limit(limit);
  return offers.filter((row) => row.offer.expiresAt.getTime() > Date.now());
}
