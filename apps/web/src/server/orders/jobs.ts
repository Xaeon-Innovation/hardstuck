import { and, eq, lte, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import { orders } from "@/server/db/schema";
import {
  createOffersForOrder,
  expireOpenOffers,
} from "@/server/orders/assignment";
import { recordLedger, transitionOrder } from "@/server/orders/service";
import {
  AUTO_COMPLETE_MS,
  CLIENT_CONFIRM_DEADLINE_MS,
  RELEASE_HOLD_MS,
} from "@/server/orders/transitions";
import { wipeDueCredentials } from "@/server/vault/service";
import { notifyOrderEvent } from "@/server/notifications/email";
import { notifyAdminsClientConfirmOverdue } from "@/server/notifications/admin-alerts";

export type JobResult = {
  expiredOffers: number;
  confirmEscalated: number;
  autoCompleted: number;
  released: number;
  reoffered: number;
  vaultWiped: number;
};

/**
 * Sweep timers:
 * 1) Expire stale offers → expired_offer → re-offer
 * 2) Escalate delivered orders when client misses 2h confirm window
 * 3) Auto-complete delivered orders after extended silence
 * 3) Release completed orders after hold → booster_payable ledger
 * 4) Wipe Solo vault after retention
 */
export async function processOrderTimers(now = new Date()): Promise<JobResult> {
  const db = getDb();
  const result: JobResult = {
    expiredOffers: 0,
    confirmEscalated: 0,
    autoCompleted: 0,
    released: 0,
    reoffered: 0,
    vaultWiped: 0,
  };

  const offered = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "offered"),
        isNotNull(orders.offerExpiresAt),
        lte(orders.offerExpiresAt, now),
      ),
    );

  for (const order of offered) {
    await expireOpenOffers(order.id);
    result.expiredOffers += 1;
    try {
      const again = await createOffersForOrder(order.id);
      if (again.offered > 0) result.reoffered += 1;
    } catch {
      // no boosters available — stays expired_offer / paid path
    }
  }

  const confirmCutoff = new Date(now.getTime() - CLIENT_CONFIRM_DEADLINE_MS);
  const overdueConfirm = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "delivered"),
        isNotNull(orders.deliveredAt),
        lte(orders.deliveredAt, confirmCutoff),
        isNull(orders.confirmEscalatedAt),
      ),
    );

  for (const order of overdueConfirm) {
    await notifyAdminsClientConfirmOverdue({
      orderId: order.id,
      detail: "Client did not confirm within 2 hours — admin may confirm completion.",
    });
    await db
      .update(orders)
      .set({ confirmEscalatedAt: now, updatedAt: now })
      .where(eq(orders.id, order.id));
    result.confirmEscalated += 1;
  }

  const deliveredCutoff = new Date(now.getTime() - AUTO_COMPLETE_MS);
  const delivered = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "delivered"),
        isNotNull(orders.deliveredAt),
        lte(orders.deliveredAt, deliveredCutoff),
      ),
    );

  for (const order of delivered) {
    const releaseAt = new Date(now.getTime() + RELEASE_HOLD_MS);
    await transitionOrder(order.id, "completed", {
      completedAt: now,
      releaseAt,
    });
    await notifyOrderEvent({
      toUserId: order.clientUserId,
      orderId: order.id,
      event: "order_completed",
      detail: "auto-complete",
    });
    result.autoCompleted += 1;
  }

  const toRelease = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "completed"),
        isNotNull(orders.releaseAt),
        lte(orders.releaseAt, now),
        isNull(orders.releasedAt),
      ),
    );

  for (const order of toRelease) {
    const payable =
      order.contractorShareUsdCents > 0
        ? order.contractorShareUsdCents
        : Math.round((order.amountUsdCents * 7500) / 10_000);
    await transitionOrder(order.id, "released", { releasedAt: now });
    await recordLedger(
      order.id,
      "released",
      order.amountUsdCents,
      "Release hold elapsed — contractor share payable",
    );
    await recordLedger(
      order.id,
      "booster_payable",
      payable,
      "Available for payout queue (75% contractor share)",
    );
    result.released += 1;
  }

  try {
    const wipe = await wipeDueCredentials(now);
    result.vaultWiped = wipe.wiped;
  } catch (e) {
    console.warn("[timers] vault wipe skipped:", e);
  }

  return result;
}
