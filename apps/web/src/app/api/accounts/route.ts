import { NextResponse } from "next/server";
import { GameSlugs } from "@hardstuck/shared";
import { requireSession } from "@/server/auth/session";
import {
  createListing,
  listPublicListings,
  purchaseListing,
} from "@/server/accounts/service";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const game = url.searchParams.get("game") ?? undefined;
  if (game && !GameSlugs.includes(game as (typeof GameSlugs)[number])) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  }
  const listings = await listPublicListings(game);
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
    game?: string;
    title?: string;
    summary?: string;
    rankLabel?: string;
    skinsSummary?: string;
    server?: string;
    priceUsdCents?: number;
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
      });
      return NextResponse.json({ listing });
    }

    if (body.action === "purchase") {
      if (!body.listingId) {
        return NextResponse.json({ error: "listingId required" }, { status: 400 });
      }
      const sale = await purchaseListing({
        listingId: body.listingId,
        buyerUserId: session.user.id,
      });
      return NextResponse.json({ saleId: sale.id, sale });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
