import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { accountListings, accountSales, sellerProfiles } from "@/server/db/schema";
import {
  adminApproveSeller,
  adminSetListingStatus,
  releaseSale,
} from "@/server/accounts/service";

export async function GET() {
  const session = await requireSession();
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const listings = await db
    .select()
    .from(accountListings)
    .orderBy(desc(accountListings.createdAt))
    .limit(100);
  const sales = await db
    .select()
    .from(accountSales)
    .orderBy(desc(accountSales.createdAt))
    .limit(100);
  const sellers = await db.select().from(sellerProfiles).limit(100);

  return NextResponse.json({ listings, sales, sellers });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    listingId?: string;
    saleId?: string;
    userId?: string;
    status?: "listed" | "removed" | "draft";
  };

  try {
    if (body.action === "list" && body.listingId && body.status) {
      const listing = await adminSetListingStatus(body.listingId, body.status);
      return NextResponse.json({ listing });
    }
    if (body.action === "approve_seller" && body.userId) {
      await adminApproveSeller(body.userId, session.user.id);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "release_sale" && body.saleId) {
      await releaseSale(body.saleId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
