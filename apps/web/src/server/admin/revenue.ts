import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  accountSales,
  accountListings,
  ledgerEntries,
  orders,
  payoutRequests,
} from "@/server/db/schema";

const PAID_ORDER_STATUSES = [
  "paid",
  "offered",
  "assigned",
  "in_progress",
  "delivered",
  "completed",
  "released",
  "paid_out",
  "disputed",
  "expired_offer",
] as const;

const PAID_SALE_STATUSES = [
  "held",
  "delivered",
  "completed",
  "released",
] as const;

export async function computeRevenueDashboard(days: number) {
  const db = getDb();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const boostRows = await db
    .select({
      game: orders.game,
      amount: orders.amountUsdCents,
      share: orders.contractorShareUsdCents,
      status: orders.status,
    })
    .from(orders)
    .where(
      and(
        inArray(orders.status, [...PAID_ORDER_STATUSES]),
        gte(orders.paidAt, since),
      ),
    );

  const saleRows = await db
    .select({
      amount: accountSales.amountUsdCents,
      share: accountSales.sellerShareUsdCents,
      listingId: accountSales.listingId,
      status: accountSales.status,
    })
    .from(accountSales)
    .where(
      and(
        inArray(accountSales.status, [...PAID_SALE_STATUSES]),
        gte(accountSales.paidAt, since),
      ),
    );

  const listingIds = [...new Set(saleRows.map((s) => s.listingId))];
  const listingMeta = new Map<string, { game: string; category: string }>();
  if (listingIds.length > 0) {
    const listings = await db
      .select({
        id: accountListings.id,
        game: accountListings.game,
        category: accountListings.category,
      })
      .from(accountListings)
      .where(inArray(accountListings.id, listingIds));
    for (const l of listings) {
      listingMeta.set(l.id, { game: l.game, category: l.category });
    }
  }

  let boostGmv = 0;
  let boostTake = 0;
  const byGame: Record<string, { gmv: number; take: number; count: number }> =
    {};
  const byCategory: Record<
    string,
    { gmv: number; take: number; count: number }
  > = {
    matched_pool: { gmv: 0, take: 0, count: 0 },
  };

  for (const o of boostRows) {
    boostGmv += o.amount;
    const take = o.amount - o.share;
    boostTake += take;
    const g = byGame[o.game] ?? { gmv: 0, take: 0, count: 0 };
    g.gmv += o.amount;
    g.take += take;
    g.count += 1;
    byGame[o.game] = g;
    byCategory.matched_pool!.gmv += o.amount;
    byCategory.matched_pool!.take += take;
    byCategory.matched_pool!.count += 1;
  }

  let marketGmv = 0;
  let marketTake = 0;
  for (const s of saleRows) {
    marketGmv += s.amount;
    const take = s.amount - s.share;
    marketTake += take;
    const meta = listingMeta.get(s.listingId);
    const cat = meta?.category ?? "account";
    const c = byCategory[cat] ?? { gmv: 0, take: 0, count: 0 };
    c.gmv += s.amount;
    c.take += take;
    c.count += 1;
    byCategory[cat] = c;
    if (meta?.game) {
      const g = byGame[meta.game] ?? { gmv: 0, take: 0, count: 0 };
      g.gmv += s.amount;
      g.take += take;
      g.count += 1;
      byGame[meta.game] = g;
    }
  }

  const [escrowRow] = await db
    .select({
      n: sql<number>`coalesce(sum(case when ${ledgerEntries.type} = 'escrow_held' then ${ledgerEntries.amountUsdCents} when ${ledgerEntries.type} in ('released','refunded','paid_out') then -${ledgerEntries.amountUsdCents} else 0 end), 0)::int`,
    })
    .from(ledgerEntries);

  const [payoutRow] = await db
    .select({
      n: sql<number>`coalesce(sum(${payoutRequests.amountUsdCents}), 0)::int`,
    })
    .from(payoutRequests)
    .where(eq(payoutRequests.status, "pending"));

  const [refundRow] = await db
    .select({
      n: sql<number>`coalesce(sum(${orders.amountUsdCents}), 0)::int`,
      c: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(eq(orders.status, "refunded"), gte(orders.updatedAt, since)));

  return {
    days,
    since: since.toISOString(),
    boostGmvUsdCents: boostGmv,
    boostTakeUsdCents: boostTake,
    marketplaceGmvUsdCents: marketGmv,
    marketplaceTakeUsdCents: marketTake,
    totalGmvUsdCents: boostGmv + marketGmv,
    totalTakeUsdCents: boostTake + marketTake,
    escrowOutstandingUsdCents: Number(escrowRow?.n ?? 0),
    payoutsPendingUsdCents: Number(payoutRow?.n ?? 0),
    refundsUsdCents: Number(refundRow?.n ?? 0),
    refundsCount: Number(refundRow?.c ?? 0),
    byGame,
    byCategory,
  };
}
