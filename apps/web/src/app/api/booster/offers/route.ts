import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { orders } from "@/server/db/schema";
import { requireSession } from "@/server/auth/session";
import { transitionOrder } from "@/server/orders/service";
import {
  acceptOffer,
  listOpenOffersForBooster,
} from "@/server/orders/assignment";
import { getBoosterProfile } from "@/server/trust/service";

export async function GET() {
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "booster" && role !== "admin") {
    return NextResponse.json({ error: "Boosters only" }, { status: 403 });
  }

  if (role === "booster") {
    const profile = await getBoosterProfile(session.user.id);
    if (profile?.status !== "approved") {
      return NextResponse.json({
        offers: [],
        verificationStatus: profile?.status ?? "pending",
        message: "Complete rank proof verification to receive offers.",
      });
    }
  }

  const offers = await listOpenOffersForBooster(session.user.id);
  return NextResponse.json({ offers });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "booster" && role !== "admin") {
    return NextResponse.json({ error: "Boosters only" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    offerId?: string;
    orderId?: string;
  };

  try {
    if (body.action === "accept" && body.offerId) {
      if (role === "booster") {
        const profile = await getBoosterProfile(session.user.id);
        if (profile?.status !== "approved") {
          return NextResponse.json(
            { error: "Booster not verified yet" },
            { status: 403 },
          );
        }
      }
      const orderId = await acceptOffer(body.offerId, session.user.id);
      return NextResponse.json({ ok: true, orderId });
    }

    if (body.action === "start" && body.orderId) {
      const db = getDb();
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, body.orderId))
        .limit(1);
      if (!order || order.boosterUserId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await transitionOrder(order.id, "in_progress", { startedAt: new Date() });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "deliver" && body.orderId) {
      const db = getDb();
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, body.orderId))
        .limit(1);
      if (!order || order.boosterUserId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await transitionOrder(order.id, "delivered", {
        deliveredAt: new Date(),
      });
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
