import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { accountSales } from "@/server/db/schema";
import { requireSession } from "@/server/auth/session";
import {
  confirmSale,
  depositSaleCredentials,
  markSalePaid,
  releaseSale,
  revealSaleCredentials,
} from "@/server/accounts/service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const [sale] = await db
    .select()
    .from(accountSales)
    .where(eq(accountSales.id, id))
    .limit(1);
  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = (session.user as { role?: string }).role;
  const ok =
    sale.buyerUserId === session.user.id ||
    sale.sellerUserId === session.user.id ||
    role === "admin";
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ sale });
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    username?: string;
    password?: string;
    note?: string;
  };
  const role = (session.user as { role?: string }).role;

  try {
    if (body.action === "pay") {
      const db = getDb();
      const [sale] = await db
        .select()
        .from(accountSales)
        .where(eq(accountSales.id, id))
        .limit(1);
      if (!sale || sale.buyerUserId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (process.env.NODE_ENV === "production") {
        const provider = process.env.PAYMENT_PROVIDER ?? "manual";
        if (provider !== "manual") {
          return NextResponse.json(
            { error: "Use checkout provider in production" },
            { status: 403 },
          );
        }
      }
      await markSalePaid(id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "deposit") {
      if (!body.username || !body.password) {
        return NextResponse.json({ error: "Credentials required" }, { status: 400 });
      }
      await depositSaleCredentials({
        saleId: id,
        sellerUserId: session.user.id,
        username: body.username,
        password: body.password,
        note: body.note,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "reveal") {
      const creds = await revealSaleCredentials({
        saleId: id,
        userId: session.user.id,
        role,
      });
      return NextResponse.json({ credentials: creds });
    }

    if (body.action === "confirm") {
      await confirmSale({ saleId: id, buyerUserId: session.user.id });
      if (role === "admin") {
        await releaseSale(id);
      }
      return NextResponse.json({ ok: true });
    }

    if (body.action === "release" && role === "admin") {
      await releaseSale(id);
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
