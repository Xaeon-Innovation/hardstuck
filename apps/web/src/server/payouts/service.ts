import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  boosterProfiles,
  orders,
  payoutRequests,
  user,
} from "@/server/db/schema";
import { getBoosterProfile } from "@/server/trust/service";
import { recordLedger, transitionOrder } from "@/server/orders/service";

export async function submitIdDocument(opts: {
  userId: string;
  imagePath: string;
}) {
  const profile = await getBoosterProfile(opts.userId);
  if (!profile) {
    throw new Error("Booster profile required");
  }
  if (profile.idStatus === "approved") {
    throw new Error("ID already approved");
  }

  const db = getDb();
  await db
    .update(boosterProfiles)
    .set({
      idStatus: "pending",
      idImagePath: opts.imagePath,
      idSubmittedAt: new Date(),
      idReviewNote: null,
      updatedAt: new Date(),
    })
    .where(eq(boosterProfiles.userId, opts.userId));

  return { ok: true as const };
}

export async function reviewIdDocument(opts: {
  boosterUserId: string;
  adminUserId: string;
  decision: "approved" | "rejected";
  note?: string;
}) {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(boosterProfiles)
    .where(eq(boosterProfiles.userId, opts.boosterUserId))
    .limit(1);
  if (!profile || profile.idStatus !== "pending") {
    throw new Error("No pending ID to review");
  }

  await db
    .update(boosterProfiles)
    .set({
      idStatus: opts.decision,
      idReviewNote: opts.note ?? null,
      idReviewedByUserId: opts.adminUserId,
      idReviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(boosterProfiles.userId, opts.boosterUserId));

  return { ok: true as const };
}

export async function listPendingIdReviews() {
  const db = getDb();
  return db
    .select({
      profile: boosterProfiles,
      userName: user.name,
      userEmail: user.email,
    })
    .from(boosterProfiles)
    .innerJoin(user, eq(user.id, boosterProfiles.userId))
    .where(eq(boosterProfiles.idStatus, "pending"))
    .orderBy(desc(boosterProfiles.idSubmittedAt))
    .limit(50);
}

/** True if booster has any open dispute freezing payouts. */
export async function hasDisputeFreeze(boosterUserId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.boosterUserId, boosterUserId),
        eq(orders.status, "disputed"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function requestPayout(opts: {
  orderId: string;
  boosterUserId: string;
  method: "payoneer" | "wise";
  destination: string;
}) {
  const dest = opts.destination.trim();
  if (!dest || dest.length < 3) {
    throw new Error("Payout destination required (email / account ID)");
  }

  const profile = await getBoosterProfile(opts.boosterUserId);
  if (!profile || profile.status !== "approved") {
    throw new Error("Booster must be rank-verified");
  }
  if (profile.idStatus !== "approved") {
    throw new Error("Upload and get ID approved before first payout");
  }

  if (await hasDisputeFreeze(opts.boosterUserId)) {
    throw new Error("Payouts frozen while a dispute is open");
  }

  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, opts.orderId))
    .limit(1);

  if (!order) throw new Error("Order not found");
  if (order.boosterUserId !== opts.boosterUserId) {
    throw new Error("Not your order");
  }
  if (order.status !== "released") {
    throw new Error("Order must be released before payout");
  }

  const [existing] = await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.orderId, opts.orderId))
    .limit(1);
  if (existing && existing.status !== "rejected" && existing.status !== "cancelled") {
    throw new Error("Payout already requested for this order");
  }

  if (existing) {
    const payable =
      order.contractorShareUsdCents > 0
        ? order.contractorShareUsdCents
        : Math.round((order.amountUsdCents * 7500) / 10_000);
    const [row] = await db
      .update(payoutRequests)
      .set({
        method: opts.method,
        destination: dest,
        status: "pending",
        amountUsdCents: payable,
        reviewNote: null,
        reviewedByUserId: null,
        reviewedAt: null,
        paidAt: null,
      })
      .where(eq(payoutRequests.id, existing.id))
      .returning();
    return row!;
  }

  const payable =
    order.contractorShareUsdCents > 0
      ? order.contractorShareUsdCents
      : Math.round((order.amountUsdCents * 7500) / 10_000);

  const [row] = await db
    .insert(payoutRequests)
    .values({
      orderId: opts.orderId,
      boosterUserId: opts.boosterUserId,
      amountUsdCents: payable,
      method: opts.method,
      destination: dest,
      status: "pending",
    })
    .returning();
  return row!;
}

export async function listBoosterPayouts(boosterUserId: string) {
  const db = getDb();
  return db
    .select({
      payout: payoutRequests,
      order: orders,
    })
    .from(payoutRequests)
    .innerJoin(orders, eq(orders.id, payoutRequests.orderId))
    .where(eq(payoutRequests.boosterUserId, boosterUserId))
    .orderBy(desc(payoutRequests.createdAt))
    .limit(50);
}

export async function listAdminPayouts(status?: "pending" | "paid" | "rejected") {
  const db = getDb();
  const base = db
    .select({
      payout: payoutRequests,
      order: orders,
      boosterName: user.name,
      boosterEmail: user.email,
    })
    .from(payoutRequests)
    .innerJoin(orders, eq(orders.id, payoutRequests.orderId))
    .innerJoin(user, eq(user.id, payoutRequests.boosterUserId))
    .orderBy(desc(payoutRequests.createdAt))
    .limit(100);

  if (status) {
    return db
      .select({
        payout: payoutRequests,
        order: orders,
        boosterName: user.name,
        boosterEmail: user.email,
      })
      .from(payoutRequests)
      .innerJoin(orders, eq(orders.id, payoutRequests.orderId))
      .innerJoin(user, eq(user.id, payoutRequests.boosterUserId))
      .where(eq(payoutRequests.status, status))
      .orderBy(desc(payoutRequests.createdAt))
      .limit(100);
  }

  return base;
}

export async function markPayoutPaid(opts: {
  payoutId: string;
  adminUserId: string;
  note?: string;
}) {
  const db = getDb();
  const [req] = await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.id, opts.payoutId))
    .limit(1);
  if (!req) throw new Error("Payout not found");
  if (req.status !== "pending") throw new Error("Payout is not pending");

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, req.orderId))
    .limit(1);
  if (!order) throw new Error("Order not found");
  if (order.status === "disputed") {
    throw new Error("Cannot pay out a disputed order");
  }
  if (order.status !== "released") {
    throw new Error(`Order status is ${order.status}, expected released`);
  }

  if (order.boosterUserId && (await hasDisputeFreeze(order.boosterUserId))) {
    // Allow paying non-disputed released orders only if THIS order isn't disputed;
    // freeze blocks new requests; admin may still clear old ones carefully.
    // Strict: block all paid_out while any dispute open.
    throw new Error("Booster has an open dispute — resolve it first");
  }

  await transitionOrder(order.id, "paid_out");
  await recordLedger(
    order.id,
    "paid_out",
    order.amountUsdCents,
    `${req.method} → ${req.destination}`,
  );

  const [updated] = await db
    .update(payoutRequests)
    .set({
      status: "paid",
      paidAt: new Date(),
      reviewedByUserId: opts.adminUserId,
      reviewedAt: new Date(),
      reviewNote: opts.note ?? null,
    })
    .where(eq(payoutRequests.id, opts.payoutId))
    .returning();

  return updated!;
}

export async function rejectPayout(opts: {
  payoutId: string;
  adminUserId: string;
  note?: string;
}) {
  const db = getDb();
  const [req] = await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.id, opts.payoutId))
    .limit(1);
  if (!req || req.status !== "pending") {
    throw new Error("Payout not pending");
  }

  const [updated] = await db
    .update(payoutRequests)
    .set({
      status: "rejected",
      reviewedByUserId: opts.adminUserId,
      reviewedAt: new Date(),
      reviewNote: opts.note ?? null,
    })
    .where(eq(payoutRequests.id, opts.payoutId))
    .returning();

  return updated!;
}

export async function listReleasedOrdersForBooster(boosterUserId: string) {
  const db = getDb();
  const released = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.boosterUserId, boosterUserId),
        eq(orders.status, "released"),
      ),
    )
    .orderBy(desc(orders.releasedAt))
    .limit(50);

  if (released.length === 0) return [];

  const pendingOrPaid = await db
    .select()
    .from(payoutRequests)
    .where(
      and(
        inArray(
          payoutRequests.orderId,
          released.map((o) => o.id),
        ),
        ne(payoutRequests.status, "rejected"),
        ne(payoutRequests.status, "cancelled"),
      ),
    );

  const blocked = new Set(pendingOrPaid.map((p) => p.orderId));
  return released.filter((o) => !blocked.has(o.id));
}
