import {
  and,
  asc,
  avg,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  sql,
} from "drizzle-orm";
import {
  MarketplaceCategories,
  SELLER_SHARE_BPS,
  type MarketplaceCategory,
} from "@hardstuck/shared";
import { getDb } from "@/server/db";
import {
  accountListings,
  accountSales,
  listingRatings,
  orders,
  saleCredentials,
  sellerProfiles,
} from "@/server/db/schema";
import { encryptSecret, decryptSecret } from "@/server/vault/crypto";
import { assertUserNotSuspended } from "@/server/access/guards";

export function sellerShareCents(amountUsdCents: number): number {
  return Math.round((amountUsdCents * SELLER_SHARE_BPS) / 10_000);
}

export type MarketplaceListFilters = {
  game?: string;
  category?: string;
  server?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  inStock?: boolean;
  maxDeliveryHours?: number;
  minRating?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "delivery";
};

export async function listPublicListings(game?: string) {
  return listMarketplaceListings({ game, category: "account" });
}

export async function listMarketplaceListings(filters: MarketplaceListFilters = {}) {
  const db = getDb();
  const conds = [eq(accountListings.status, "listed")];

  if (filters.game) conds.push(eq(accountListings.game, filters.game));
  if (filters.category) {
    conds.push(eq(accountListings.category, filters.category));
  }
  if (filters.server) conds.push(eq(accountListings.server, filters.server));
  if (filters.q) {
    conds.push(
      ilike(accountListings.title, `%${filters.q.replace(/[%_]/g, "")}%`),
    );
  }
  if (filters.minPrice != null) {
    conds.push(gte(accountListings.priceUsdCents, filters.minPrice));
  }
  if (filters.maxPrice != null) {
    conds.push(lte(accountListings.priceUsdCents, filters.maxPrice));
  }
  if (filters.featured) {
    conds.push(eq(accountListings.featured, true));
  }
  if (filters.inStock) {
    conds.push(
      sql`(${accountListings.stock} is null or ${accountListings.stock} > 0)`,
    );
  }
  if (filters.maxDeliveryHours != null) {
    conds.push(
      and(
        sql`${accountListings.deliveryHours} is not null`,
        lte(accountListings.deliveryHours, filters.maxDeliveryHours),
      )!,
    );
  }

  let orderBy;
  switch (filters.sort) {
    case "price_asc":
      orderBy = [asc(accountListings.priceUsdCents)];
      break;
    case "price_desc":
      orderBy = [desc(accountListings.priceUsdCents)];
      break;
    case "delivery":
      orderBy = [
        sql`${accountListings.deliveryHours} asc nulls last`,
        desc(accountListings.featured),
      ];
      break;
    default:
      orderBy = [
        desc(accountListings.featured),
        desc(accountListings.createdAt),
      ];
  }

  const rows = await db
    .select()
    .from(accountListings)
    .where(and(...conds))
    .orderBy(...orderBy)
    .limit(100);

  const sellerIds = [...new Set(rows.map((r) => r.sellerUserId))];
  const ratingMap = new Map<string, { avg: number; count: number }>();
  if (sellerIds.length > 0) {
    const ratingRows = await db
      .select({
        sellerUserId: listingRatings.sellerUserId,
        avg: avg(listingRatings.stars),
        count: count(),
      })
      .from(listingRatings)
      .where(inArray(listingRatings.sellerUserId, sellerIds))
      .groupBy(listingRatings.sellerUserId);
    for (const r of ratingRows) {
      ratingMap.set(r.sellerUserId, {
        avg: Number(r.avg ?? 0),
        count: Number(r.count ?? 0),
      });
    }
  }

  const enriched = rows.map((r) => ({
    ...r,
    sellerRating: ratingMap.get(r.sellerUserId) ?? { avg: 0, count: 0 },
  }));

  if (filters.minRating != null && filters.minRating > 0) {
    return enriched.filter(
      (r) => r.sellerRating.avg >= filters.minRating!,
    );
  }
  return enriched;
}

export async function getOrCreateSellerProfile(userId: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(sellerProfiles)
    .where(eq(sellerProfiles.userId, userId))
    .limit(1);
  if (existing) return existing;
  const [row] = await db
    .insert(sellerProfiles)
    .values({ userId, status: "pending" })
    .returning();
  return row!;
}

export async function createListing(opts: {
  sellerUserId: string;
  game: string;
  title: string;
  summary: string;
  rankLabel?: string;
  skinsSummary?: string;
  server: string;
  priceUsdCents: number;
  category?: MarketplaceCategory;
  attributes?: Record<string, unknown>;
  deliveryHours?: number;
  stock?: number;
}) {
  const suspended = await assertUserNotSuspended(opts.sellerUserId);
  if (suspended) throw new Error(suspended);

  const category = opts.category ?? "account";
  if (!MarketplaceCategories.includes(category)) {
    throw new Error("Invalid category");
  }

  if (category === "boosting") {
    const { getBoosterProfile } = await import("@/server/trust/service");
    const booster = await getBoosterProfile(opts.sellerUserId);
    if (!booster || booster.status !== "approved") {
      throw new Error("Approved booster profile required for boosting offers");
    }
    const games = (booster.games ?? []) as string[];
    if (!games.includes(opts.game)) {
      throw new Error("Booster profile must cover this game");
    }
  } else {
    const profile = await getOrCreateSellerProfile(opts.sellerUserId);
    if (profile.status !== "approved" && profile.idStatus !== "verified") {
      // Soft-launch: allow draft; admin lists after review
    }
  }

  const db = getDb();
  const [row] = await db
    .insert(accountListings)
    .values({
      sellerUserId: opts.sellerUserId,
      game: opts.game,
      category,
      title: opts.title,
      summary: opts.summary,
      rankLabel: opts.rankLabel,
      skinsSummary: opts.skinsSummary,
      server: opts.server,
      priceUsdCents: opts.priceUsdCents,
      attributes: opts.attributes ?? {},
      deliveryHours: opts.deliveryHours ?? null,
      stock: opts.stock ?? null,
      status: "draft",
    })
    .returning();
  return row!;
}

export async function purchaseListing(opts: {
  listingId: string;
  buyerUserId: string;
}) {
  const suspended = await assertUserNotSuspended(opts.buyerUserId);
  if (suspended) throw new Error(suspended);

  const db = getDb();
  const [listing] = await db
    .select()
    .from(accountListings)
    .where(eq(accountListings.id, opts.listingId))
    .limit(1);
  if (!listing || listing.status !== "listed") {
    throw new Error("Listing not available");
  }
  if (listing.sellerUserId === opts.buyerUserId) {
    throw new Error("Cannot buy your own listing");
  }
  if (listing.stock != null && listing.stock < 1) {
    throw new Error("Out of stock");
  }

  const amount = listing.priceUsdCents;
  const [sale] = await db
    .insert(accountSales)
    .values({
      listingId: listing.id,
      buyerUserId: opts.buyerUserId,
      sellerUserId: listing.sellerUserId,
      status: "awaiting_payment",
      amountUsdCents: amount,
      sellerShareUsdCents: sellerShareCents(amount),
    })
    .returning();

  // Accounts are unique units; other categories decrement stock when set.
  if (listing.category === "account") {
    await db
      .update(accountListings)
      .set({ status: "reserved", updatedAt: new Date() })
      .where(eq(accountListings.id, listing.id));
  } else if (listing.stock != null) {
    const nextStock = listing.stock - 1;
    await db
      .update(accountListings)
      .set({
        stock: nextStock,
        status: nextStock <= 0 ? "reserved" : "listed",
        updatedAt: new Date(),
      })
      .where(eq(accountListings.id, listing.id));
  }

  return sale!;
}

/**
 * After marketplace boosting sale is paid: create a matched-pool-shaped order
 * already assigned to the seller (skips claim queue).
 */
export async function fulfillBoostingSaleAsOrder(saleId: string) {
  const db = getDb();
  const [sale] = await db
    .select()
    .from(accountSales)
    .where(eq(accountSales.id, saleId))
    .limit(1);
  if (!sale) throw new Error("Sale not found");
  const [listing] = await db
    .select()
    .from(accountListings)
    .where(eq(accountListings.id, sale.listingId))
    .limit(1);
  if (!listing || listing.category !== "boosting") return null;

  const attrs = (listing.attributes ?? {}) as Record<string, unknown>;
  const startRankKey = String(attrs.startRankKey ?? listing.rankLabel ?? "unknown");
  const endRankKey = String(attrs.endRankKey ?? startRankKey);
  const queue = String(attrs.queue ?? "solo");

  const [order] = await db
    .insert(orders)
    .values({
      clientUserId: sale.buyerUserId,
      boosterUserId: sale.sellerUserId,
      status: "assigned",
      game: listing.game,
      serviceType: String(attrs.serviceType ?? "solo"),
      skuSlug: String(attrs.skuSlug ?? `${listing.game}_rank`),
      skuPayload: { marketplaceSaleId: sale.id, listingId: listing.id },
      startRankKey,
      endRankKey,
      server: listing.server,
      queue,
      amountUsdCents: sale.amountUsdCents,
      amountEurCents: Math.round(sale.amountUsdCents * 0.92),
      contractorShareUsdCents: sale.sellerShareUsdCents,
      currency: "USD",
      divisions: 0,
      paidAt: sale.paidAt ?? new Date(),
      assignedAt: new Date(),
      riskDisclosureAcceptedAt: new Date(),
    })
    .returning();

  return order ?? null;
}

export async function rateSale(opts: {
  saleId: string;
  buyerUserId: string;
  stars: number;
  comment?: string;
}) {
  if (opts.stars < 1 || opts.stars > 5) throw new Error("Stars must be 1–5");
  const db = getDb();
  const [sale] = await db
    .select()
    .from(accountSales)
    .where(eq(accountSales.id, opts.saleId))
    .limit(1);
  if (!sale) throw new Error("Sale not found");
  if (sale.buyerUserId !== opts.buyerUserId) throw new Error("Forbidden");
  if (!["completed", "released"].includes(sale.status)) {
    throw new Error("Rate after confirming delivery");
  }

  const [row] = await db
    .insert(listingRatings)
    .values({
      saleId: sale.id,
      listingId: sale.listingId,
      sellerUserId: sale.sellerUserId,
      buyerUserId: opts.buyerUserId,
      stars: opts.stars,
      comment: opts.comment ?? null,
    })
    .onConflictDoNothing({ target: listingRatings.saleId })
    .returning();
  return row;
}

export async function listSellerListings(sellerUserId: string) {
  const db = getDb();
  return db
    .select()
    .from(accountListings)
    .where(eq(accountListings.sellerUserId, sellerUserId))
    .orderBy(desc(accountListings.createdAt))
    .limit(100);
}

/** Sellers pause by moving listed → draft. Admin re-lists. */
export async function pauseListing(listingId: string, sellerUserId: string) {
  const db = getDb();
  const [listing] = await db
    .select()
    .from(accountListings)
    .where(eq(accountListings.id, listingId))
    .limit(1);
  if (!listing || listing.sellerUserId !== sellerUserId) {
    throw new Error("Not found");
  }
  if (listing.status !== "listed") {
    throw new Error("Only listed offers can be paused");
  }
  const [row] = await db
    .update(accountListings)
    .set({ status: "draft", updatedAt: new Date() })
    .where(eq(accountListings.id, listingId))
    .returning();
  return row;
}

export async function markSalePaid(saleId: string) {
  const db = getDb();
  const [sale] = await db
    .update(accountSales)
    .set({
      status: "held",
      paidAt: new Date(),
      provider: "manual",
      updatedAt: new Date(),
    })
    .where(eq(accountSales.id, saleId))
    .returning();

  if (sale) {
    try {
      await fulfillBoostingSaleAsOrder(sale.id);
    } catch {
      /* non-boosting or already handled */
    }
  }
  return sale;
}

export async function depositSaleCredentials(opts: {
  saleId: string;
  sellerUserId: string;
  username: string;
  password: string;
  note?: string;
}) {
  const db = getDb();
  const [sale] = await db
    .select()
    .from(accountSales)
    .where(eq(accountSales.id, opts.saleId))
    .limit(1);
  if (!sale) throw new Error("Sale not found");
  if (sale.sellerUserId !== opts.sellerUserId) throw new Error("Forbidden");
  if (sale.status !== "held" && sale.status !== "delivered") {
    throw new Error("Sale not ready for credentials");
  }

  const blob = encryptSecret(
    JSON.stringify({
      username: opts.username,
      password: opts.password,
      note: opts.note,
    }),
  );

  const [existing] = await db
    .select()
    .from(saleCredentials)
    .where(eq(saleCredentials.saleId, sale.id))
    .limit(1);

  if (existing) {
    await db
      .update(saleCredentials)
      .set({
        ciphertext: blob.ciphertext,
        iv: blob.iv,
        authTag: blob.authTag,
        updatedAt: new Date(),
        wipedAt: null,
      })
      .where(eq(saleCredentials.saleId, sale.id));
  } else {
    await db.insert(saleCredentials).values({
      saleId: sale.id,
      ciphertext: blob.ciphertext,
      iv: blob.iv,
      authTag: blob.authTag,
    });
  }

  await db
    .update(accountSales)
    .set({
      status: "delivered",
      deliveredAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(accountSales.id, sale.id));
}

export async function revealSaleCredentials(opts: {
  saleId: string;
  userId: string;
  role?: string;
}) {
  const db = getDb();
  const [sale] = await db
    .select()
    .from(accountSales)
    .where(eq(accountSales.id, opts.saleId))
    .limit(1);
  if (!sale) throw new Error("Sale not found");
  const allowed =
    sale.buyerUserId === opts.userId ||
    sale.sellerUserId === opts.userId ||
    opts.role === "admin";
  if (!allowed) throw new Error("Forbidden");
  if (!["delivered", "completed", "held"].includes(sale.status)) {
    throw new Error("Credentials not available");
  }

  const [cred] = await db
    .select()
    .from(saleCredentials)
    .where(eq(saleCredentials.saleId, opts.saleId))
    .limit(1);
  if (!cred || cred.wipedAt) throw new Error("No credentials");

  const plain = decryptSecret({
    ciphertext: cred.ciphertext,
    iv: cred.iv,
    authTag: cred.authTag,
  });
  return JSON.parse(plain) as {
    username: string;
    password: string;
    note?: string;
  };
}

export async function confirmSale(opts: { saleId: string; buyerUserId: string }) {
  const db = getDb();
  const [sale] = await db
    .select()
    .from(accountSales)
    .where(eq(accountSales.id, opts.saleId))
    .limit(1);
  if (!sale) throw new Error("Sale not found");
  if (sale.buyerUserId !== opts.buyerUserId) throw new Error("Forbidden");
  if (sale.status !== "delivered") throw new Error("Not delivered yet");

  await db
    .update(accountSales)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(accountSales.id, sale.id));

  await db
    .update(accountListings)
    .set({ status: "sold", updatedAt: new Date() })
    .where(eq(accountListings.id, sale.listingId));
}

export async function releaseSale(saleId: string) {
  const db = getDb();
  const [sale] = await db
    .update(accountSales)
    .set({
      status: "released",
      releasedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(accountSales.id, saleId))
    .returning();

  if (sale) {
    await db
      .update(saleCredentials)
      .set({ wipedAt: new Date(), updatedAt: new Date() })
      .where(eq(saleCredentials.saleId, saleId));
  }
  return sale;
}

export async function adminSetListingStatus(
  listingId: string,
  status: "listed" | "removed" | "draft",
) {
  const db = getDb();
  const [row] = await db
    .update(accountListings)
    .set({ status, updatedAt: new Date() })
    .where(eq(accountListings.id, listingId))
    .returning();
  return row;
}

export async function adminApproveSeller(userId: string, adminId: string) {
  const db = getDb();
  return db
    .update(sellerProfiles)
    .set({
      status: "approved",
      idStatus: "verified",
      reviewedByUserId: adminId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(sellerProfiles.userId, userId));
}
