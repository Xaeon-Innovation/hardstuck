import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { orders, paymentEvents } from "@/server/db/schema";
import { notifyOrderEvent } from "@/server/notifications/email";
import { createOffersForOrder } from "./assignment";
import { recordLedger, transitionOrder } from "./service";

/**
 * Idempotent payment capture: ledger + paid → offers.
 * Safe to call from Polar webhook or manual/admin pay.
 */
export async function fulfillOrderPayment(opts: {
  orderId: string;
  provider: string;
  providerPaymentId: string;
  providerEventId: string;
  rawPayload?: string;
}) {
  const db = getDb();

  const existing = await db
    .select()
    .from(paymentEvents)
    .where(eq(paymentEvents.providerEventId, opts.providerEventId))
    .limit(1);
  if (existing.length > 0) {
    return { duplicate: true as const };
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, opts.orderId))
    .limit(1);
  if (!order) {
    throw new Error("Order not found");
  }

  await db.insert(paymentEvents).values({
    provider: opts.provider,
    providerEventId: opts.providerEventId,
    orderId: opts.orderId,
    type: "payment.succeeded",
    payloadJson: opts.rawPayload ?? "{}",
  });

  if (order.status === "awaiting_payment") {
    await transitionOrder(order.id, "paid", {
      paidAt: new Date(),
      provider: opts.provider,
      providerPaymentId: opts.providerPaymentId,
    });
    await recordLedger(
      order.id,
      "escrow_held",
      order.amountUsdCents,
      `${opts.provider} payment captured`,
    );
    await createOffersForOrder(order.id);
    await notifyOrderEvent({
      toUserId: order.clientUserId,
      orderId: order.id,
      event: "order_paid",
    });
  }

  return { duplicate: false as const, orderId: order.id };
}
