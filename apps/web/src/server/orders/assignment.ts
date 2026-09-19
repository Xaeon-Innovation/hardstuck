import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db";
import { orderOffers, orders, user } from "@/server/db/schema";
import { notifyOrderEvent } from "@/server/notifications/email";
import { listApprovedBoosterIds } from "@/server/trust/service";
import { OFFER_TTL_MS } from "./transitions";
import { transitionOrder } from "./service";

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

  const approvedIds = await listApprovedBoosterIds(limit);
  if (approvedIds.length === 0) {
    return { offered: 0 };
  }

  const boosters = await db
    .select()
    .from(user)
    .where(and(eq(user.role, "booster"), inArray(user.id, approvedIds)))
    .limit(limit);

  if (boosters.length === 0) {
    return { offered: 0 };
  }

  const expiresAt = new Date(Date.now() + OFFER_TTL_MS);
  await db.insert(orderOffers).values(
    boosters.map((b) => ({
      orderId,
      boosterUserId: b.id,
      expiresAt,
      status: "pending" as const,
    })),
  );

  await transitionOrder(orderId, "offered", {
    offeredAt: new Date(),
    offerExpiresAt: expiresAt,
  });

  for (const b of boosters) {
    await notifyOrderEvent({
      toUserId: b.id,
      orderId,
      event: "order_offered",
    });
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
