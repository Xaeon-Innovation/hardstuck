import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { OrderStatus } from "@hardstuck/shared";
import { getDb } from "@/server/db";
import { ledgerEntries, orders } from "@/server/db/schema";
import { requireSession } from "@/server/auth/session";
import { recordLedger, transitionOrder } from "@/server/orders/service";
import { createOffersForOrder } from "@/server/orders/assignment";
import { processOrderTimers } from "@/server/orders/jobs";

async function requireAdmin() {
  const session = await requireSession();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(100);

  return NextResponse.json({ orders: rows });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    orderId?: string;
    status?: OrderStatus;
  };

  try {
    if (body.action === "run_timers") {
      const result = await processOrderTimers();
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "mark_paid" && body.orderId) {
      const { randomUUID } = await import("crypto");
      const { fulfillOrderPayment } = await import(
        "@/server/orders/fulfill-payment"
      );
      await fulfillOrderPayment({
        orderId: body.orderId,
        provider: "manual",
        providerPaymentId: `admin_${randomUUID()}`,
        providerEventId: `admin_mark_paid_${body.orderId}_${Date.now()}`,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "refund" && body.orderId) {
      const db = getDb();
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, body.orderId))
        .limit(1);
      if (!order) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      await transitionOrder(order.id, "refunded");
      await recordLedger(
        order.id,
        "refunded",
        order.amountUsdCents,
        "Admin refund",
      );
      return NextResponse.json({ ok: true });
    }

    if (body.action === "dispute" && body.orderId) {
      await transitionOrder(body.orderId, "disputed");
      const { getDb } = await import("@/server/db");
      const { payoutRequests } = await import("@/server/db/schema");
      const { and, eq } = await import("drizzle-orm");
      const db = getDb();
      await db
        .update(payoutRequests)
        .set({
          status: "cancelled",
          reviewNote: "Cancelled — order disputed",
          reviewedAt: new Date(),
        })
        .where(
          and(
            eq(payoutRequests.orderId, body.orderId),
            eq(payoutRequests.status, "pending"),
          ),
        );
      return NextResponse.json({ ok: true });
    }

    if (body.action === "reoffer" && body.orderId) {
      const offers = await createOffersForOrder(body.orderId);
      return NextResponse.json({ ok: true, offers });
    }

    if (body.action === "ledger" && body.orderId) {
      const db = getDb();
      const rows = await db
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.orderId, body.orderId))
        .orderBy(desc(ledgerEntries.createdAt));
      return NextResponse.json({ entries: rows });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
