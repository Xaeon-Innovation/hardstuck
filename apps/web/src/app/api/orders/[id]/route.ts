import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { orders } from "@/server/db/schema";
import { requireSession } from "@/server/auth/session";
import { fulfillOrderPayment } from "@/server/orders/fulfill-payment";
import { transitionOrder } from "@/server/orders/service";
import { getPaymentPort } from "@/server/payments";
import { RELEASE_HOLD_MS } from "@/server/orders/transitions";
import { randomUUID } from "crypto";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const role = (session.user as { role?: string }).role;
  const isOwner = order.clientUserId === session.user.id;
  const isBooster = order.boosterUserId === session.user.id;
  const isAdmin = role === "admin";
  if (!isOwner && !isBooster && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    order,
    paymentProvider: process.env.PAYMENT_PROVIDER ?? "manual",
    allowSimulatePay:
      process.env.NODE_ENV !== "production" ||
      (process.env.PAYMENT_PROVIDER ?? "manual") === "manual",
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const action = body.action ?? "pay";

  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (order.clientUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    if (action === "checkout") {
      const port = getPaymentPort();
      if (port.provider === "manual") {
        return NextResponse.json(
          {
            error:
              "PAYMENT_PROVIDER is manual — use action=pay, or set polar + POLAR_PRODUCT_ID",
          },
          { status: 400 },
        );
      }
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const checkout = await port.createCheckout({
        orderId: order.id,
        amountUsdCents: order.amountUsdCents,
        currency: "USD",
        customerEmail: session.user.email,
        successUrl: `${appUrl}/orders/${order.id}?paid=1&checkout_id={CHECKOUT_ID}`,
        cancelUrl: `${appUrl}/orders/${order.id}`,
      });

      await db
        .update(orders)
        .set({
          provider: port.provider,
          providerPaymentId: checkout.providerPaymentId,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      return NextResponse.json(checkout);
    }

    if (action === "pay") {
      const provider = process.env.PAYMENT_PROVIDER ?? "manual";
      if (
        process.env.NODE_ENV === "production" &&
        provider !== "manual"
      ) {
        return NextResponse.json(
          {
            error:
              "Simulate pay is disabled in production when a live payment provider is configured",
          },
          { status: 403 },
        );
      }
      await fulfillOrderPayment({
        orderId: order.id,
        provider: "manual",
        providerPaymentId: `manual_${randomUUID()}`,
        providerEventId: `manual_pay_${order.id}_${Date.now()}`,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "confirm") {
      const releaseAt = new Date(Date.now() + RELEASE_HOLD_MS);
      await transitionOrder(order.id, "completed", {
        completedAt: new Date(),
        releaseAt,
      });
      return NextResponse.json({ ok: true, releaseAt });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
