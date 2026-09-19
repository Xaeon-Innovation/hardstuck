import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { orders } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  depositCredentials,
  getCredentialMeta,
  revealCredentials,
} from "@/server/vault/service";

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

  if (order.serviceType !== "solo") {
    return NextResponse.json({ applicable: false });
  }

  const meta = await getCredentialMeta(id);
  return NextResponse.json({
    applicable: true,
    hasCredentials: Boolean(meta && !meta.wipedAt),
    wiped: Boolean(meta?.wipedAt),
    label: meta?.label ?? null,
    updatedAt: meta?.updatedAt ?? null,
    canDeposit: isOwner,
    canReveal: isBooster || isAdmin,
  });
}

const depositSchema = z.object({
  action: z.literal("deposit"),
  username: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
  note: z.string().max(500).optional(),
  label: z.string().max(100).optional(),
});

const revealSchema = z.object({
  action: z.literal("reveal"),
});

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;

  try {
    if (action === "deposit") {
      const parsed = depositSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      await depositCredentials({
        orderId: id,
        userId: session.user.id,
        payload: {
          username: parsed.data.username,
          password: parsed.data.password,
          note: parsed.data.note,
        },
        label: parsed.data.label,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "reveal") {
      const parsed = revealSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid" }, { status: 400 });
      }
      const role = (session.user as { role?: string }).role;
      const secrets = await revealCredentials({
        orderId: id,
        userId: session.user.id,
        role,
      });
      return NextResponse.json({ secrets });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
