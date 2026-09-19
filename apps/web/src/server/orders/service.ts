import { eq } from "drizzle-orm";
import type { OrderStatus } from "@hardstuck/shared";
import { getDb } from "@/server/db";
import { ledgerEntries, orders } from "@/server/db/schema";
import { assertTransition } from "./transitions";

export async function transitionOrder(
  orderId: string,
  to: OrderStatus,
  patch: Partial<typeof orders.$inferInsert> = {},
) {
  const db = getDb();
  const [current] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!current) throw new Error("Order not found");

  assertTransition(current.status as OrderStatus, to);

  const [updated] = await db
    .update(orders)
    .set({
      ...patch,
      status: to,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning();

  return updated!;
}

export async function recordLedger(
  orderId: string,
  type: "escrow_held" | "booster_payable" | "released" | "paid_out" | "refunded",
  amountUsdCents: number,
  note?: string,
) {
  const db = getDb();
  const [row] = await db
    .insert(ledgerEntries)
    .values({ orderId, type, amountUsdCents, note })
    .returning();
  return row!;
}
