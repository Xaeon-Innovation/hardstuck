import { and, desc, eq } from "drizzle-orm";
import { SELLER_SHARE_BPS } from "@hardstuck/shared";
import { getDb } from "@/server/db";
import {
  accountListings,
  accountSales,
  saleCredentials,
  sellerProfiles,
} from "@/server/db/schema";
import { encryptSecret, decryptSecret } from "@/server/vault/crypto";

export function sellerShareCents(amountUsdCents: number): number {
  return Math.round((amountUsdCents * SELLER_SHARE_BPS) / 10_000);
}

export async function listPublicListings(game?: string) {
  const db = getDb();
  const cond = game
    ? and(eq(accountListings.status, "listed"), eq(accountListings.game, game))
    : eq(accountListings.status, "listed");
  return db
    .select()
    .from(accountListings)
    .where(cond)
    .orderBy(desc(accountListings.featured), desc(accountListings.createdAt))
    .limit(100);
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
}) {
  const profile = await getOrCreateSellerProfile(opts.sellerUserId);
  if (profile.status !== "approved" && profile.idStatus !== "verified") {
    // Soft-launch: allow draft; admin lists after review
  }
  const db = getDb();
  const [row] = await db
    .insert(accountListings)
    .values({
      ...opts,
      status: "draft",
    })
    .returning();
  return row!;
}

export async function purchaseListing(opts: {
  listingId: string;
  buyerUserId: string;
}) {
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

  await db
    .update(accountListings)
    .set({ status: "reserved", updatedAt: new Date() })
    .where(eq(accountListings.id, listing.id));

  return sale!;
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
