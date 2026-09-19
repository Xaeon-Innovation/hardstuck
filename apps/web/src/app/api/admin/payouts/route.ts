import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth/session";
import {
  listAdminPayouts,
  markPayoutPaid,
  rejectPayout,
} from "@/server/payouts/service";

async function requireAdmin() {
  const session = await requireSession();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") return null;
  return session;
}

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = new URL(req.url).searchParams.get("status") as
    | "pending"
    | "paid"
    | "rejected"
    | null;

  const payouts = await listAdminPayouts(status ?? "pending");
  return NextResponse.json({ payouts });
}

const actSchema = z.object({
  action: z.enum(["mark_paid", "reject"]),
  payoutId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = actSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.action === "mark_paid") {
      await markPayoutPaid({
        payoutId: parsed.data.payoutId,
        adminUserId: session.user.id,
        note: parsed.data.note,
      });
    } else {
      await rejectPayout({
        payoutId: parsed.data.payoutId,
        adminUserId: session.user.id,
        note: parsed.data.note,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
