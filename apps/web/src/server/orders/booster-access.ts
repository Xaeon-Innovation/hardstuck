import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { orderOffers } from "@/server/db/schema";

/** Booster may view order details before accept if they hold a pending offer. */
export async function boosterHasPendingOfferForOrder(
  boosterUserId: string,
  orderId: string,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: orderOffers.id })
    .from(orderOffers)
    .where(
      and(
        eq(orderOffers.orderId, orderId),
        eq(orderOffers.boosterUserId, boosterUserId),
        eq(orderOffers.status, "pending"),
      ),
    )
    .limit(1);
  return Boolean(row);
}
