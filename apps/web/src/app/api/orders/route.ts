import { NextResponse } from "next/server";
import {
  createOrderSchema,
  quotePrice,
  type QuoteInput,
} from "@hardstuck/shared";
import { getDb } from "@/server/db";
import { orders } from "@/server/db/schema";
import { requireSession } from "@/server/auth/session";
import {
  rateLimit,
  rateLimitResponse,
} from "@/server/security/rate-limit";

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit({
    key: `orders:${session.user.id}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const body = await req.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const eurPerUsd = Number(process.env.EUR_PER_USD ?? "0.92");
  const input = parsed.data as QuoteInput & {
    riskDisclosureAccepted: true;
  };
  const quote = quotePrice({ ...input, eurPerUsd });
  if (!quote.ok) {
    return NextResponse.json({ error: quote.error }, { status: 400 });
  }

  try {
    const { assertGameOpenForMatchedPool } = await import(
      "@/server/games/availability"
    );
    await assertGameOpenForMatchedPool(quote.game);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Game is offline" },
      { status: 409 },
    );
  }

  const { assertUserNotSuspended } = await import("@/server/access/guards");
  const suspended = await assertUserNotSuspended(session.user.id);
  if (suspended) {
    return NextResponse.json({ error: suspended }, { status: 403 });
  }

  const db = getDb();
  const [order] = await db
    .insert(orders)
    .values({
      clientUserId: session.user.id,
      status: "awaiting_payment",
      game: quote.game,
      serviceType: quote.serviceType,
      skuSlug: quote.skuSlug,
      skuPayload: parsed.data.skuPayload ?? {},
      startRankKey: quote.startRankKey,
      endRankKey: quote.endRankKey,
      server: parsed.data.server,
      queue: parsed.data.queue,
      currentLpBand: parsed.data.currentLpBand,
      lpGainBand: parsed.data.lpGainBand,
      addOnKeys: parsed.data.addOnKeys ?? [],
      amountUsdCents: quote.amountUsdCents,
      amountEurCents: quote.amountEurCents,
      contractorShareUsdCents: quote.contractorShareUsdCents,
      currency: "USD",
      divisions: quote.divisions,
      riskDisclosureAcceptedAt: new Date(),
    })
    .returning();

  return NextResponse.json({ orderId: order!.id, order });
}

export async function GET() {
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { eq, desc } = await import("drizzle-orm");
  const role = (session.user as { role?: string }).role;
  const rows =
    role === "admin"
      ? await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100)
      : await db
          .select()
          .from(orders)
          .where(eq(orders.clientUserId, session.user.id))
          .orderBy(desc(orders.createdAt))
          .limit(50);

  return NextResponse.json({ orders: rows });
}
