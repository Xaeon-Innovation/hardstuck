import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { ledgerEntries, orders } from "@/server/db/schema";
import { listOpenOffersForBooster } from "@/server/orders/assignment";

export async function GET() {
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "booster" && role !== "admin") {
    return NextResponse.json({ error: "Boosters only" }, { status: 403 });
  }

  const db = getDb();
  const myOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.boosterUserId, session.user.id))
    .orderBy(desc(orders.updatedAt))
    .limit(50);

  const offers = await listOpenOffersForBooster(session.user.id);

  const orderIds = myOrders.map((o) => o.id);
  let earnings = {
    payableCents: 0,
    releasedCents: 0,
    paidOutCents: 0,
  };

  if (orderIds.length > 0) {
    const rows = await db
      .select({
        type: ledgerEntries.type,
        total: sql<number>`coalesce(sum(${ledgerEntries.amountUsdCents}), 0)`,
      })
      .from(ledgerEntries)
      .where(
        and(
          inArray(ledgerEntries.orderId, orderIds),
          inArray(ledgerEntries.type, [
            "booster_payable",
            "released",
            "paid_out",
          ]),
        ),
      )
      .groupBy(ledgerEntries.type);

    for (const row of rows) {
      const cents = Number(row.total);
      if (row.type === "booster_payable") earnings.payableCents = cents;
      if (row.type === "released") earnings.releasedCents = cents;
      if (row.type === "paid_out") earnings.paidOutCents = cents;
    }
  }

  return NextResponse.json({
    offers,
    orders: myOrders,
    earnings,
  });
}
