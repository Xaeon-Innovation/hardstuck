import { NextResponse } from "next/server";
import {
  GameSlugs,
  MarketplaceCategories,
  type MarketplaceCategory,
} from "@hardstuck/shared";
import { requireSession } from "@/server/auth/session";
import {
  createListing,
  listMarketplaceListings,
  listSellerListings,
  pauseListing,
  purchaseListing,
  rateSale,
} from "@/server/accounts/service";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mine = url.searchParams.get("mine") === "1";

  if (mine) {
    const session = await requireSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const listings = await listSellerListings(session.user.id);
    return NextResponse.json({ listings });
  }

  const game = url.searchParams.get("game") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  if (game && !GameSlugs.includes(game as (typeof GameSlugs)[number])) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  }
  if (
    category &&
    !MarketplaceCategories.includes(category as MarketplaceCategory)
  ) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const minPrice = url.searchParams.get("minPrice");
  const maxPrice = url.searchParams.get("maxPrice");
  const maxDeliveryHours = url.searchParams.get("maxDeliveryHours");
  const minRating = url.searchParams.get("minRating");
  const sort = url.searchParams.get("sort") as
    | "newest"
    | "price_asc"
    | "price_desc"
    | "delivery"
    | null;

  const listings = await listMarketplaceListings({
    game,
    category,
    server: url.searchParams.get("server") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    featured: url.searchParams.get("featured") === "1",
    inStock: url.searchParams.get("inStock") === "1",
    maxDeliveryHours: maxDeliveryHours
      ? Number(maxDeliveryHours)
      : undefined,
    minRating: minRating ? Number(minRating) : undefined,
    sort: sort ?? "newest",
  });
  return NextResponse.json({ listings });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    action?: string;
    listingId?: string;
    saleId?: string;
    game?: string;
    title?: string;
    summary?: string;
    rankLabel?: string;
    skinsSummary?: string;
    server?: string;
    priceUsdCents?: number;
    category?: MarketplaceCategory;
    attributes?: Record<string, unknown>;
    deliveryHours?: number;
    stock?: number;
    stars?: number;
    comment?: string;
  } | null;

  if (!body?.action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  try {
    if (body.action === "create") {
      if (
        !body.game ||
        !body.title ||
        !body.summary ||
        !body.server ||
        !body.priceUsdCents
      ) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const listing = await createListing({
        sellerUserId: session.user.id,
        game: body.game,
        title: body.title,
        summary: body.summary,
        rankLabel: body.rankLabel,
        skinsSummary: body.skinsSummary,
        server: body.server,
        priceUsdCents: body.priceUsdCents,
        category: body.category,
        attributes: body.attributes,
        deliveryHours: body.deliveryHours,
        stock: body.stock,
      });
      return NextResponse.json({ listing });
    }

    if (body.action === "purchase") {
      if (!body.listingId) {
        return NextResponse.json(
          { error: "listingId required" },
          { status: 400 },
        );
      }
      const sale = await purchaseListing({
        listingId: body.listingId,
        buyerUserId: session.user.id,
      });
      return NextResponse.json({ saleId: sale.id, sale });
    }

    if (body.action === "pause") {
      if (!body.listingId) {
        return NextResponse.json(
          { error: "listingId required" },
          { status: 400 },
        );
      }
      const listing = await pauseListing(body.listingId, session.user.id);
      return NextResponse.json({ listing });
    }

    if (body.action === "rate") {
      if (!body.saleId || !body.stars) {
        return NextResponse.json(
          { error: "saleId and stars required" },
          { status: 400 },
        );
      }
      const rating = await rateSale({
        saleId: body.saleId,
        buyerUserId: session.user.id,
        stars: body.stars,
        comment: body.comment,
      });
      return NextResponse.json({ rating });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
