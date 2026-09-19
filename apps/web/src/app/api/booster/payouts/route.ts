import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth/session";
import {
  hasDisputeFreeze,
  listBoosterPayouts,
  listReleasedOrdersForBooster,
  requestPayout,
} from "@/server/payouts/service";
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

  const [payouts, available, profile, disputeFreeze] = await Promise.all([
    listBoosterPayouts(session.user.id),
    listReleasedOrdersForBooster(session.user.id),
    getBoosterProfile(session.user.id),
    hasDisputeFreeze(session.user.id),
  ]);

  return NextResponse.json({
    payouts,
    available,
    idStatus: profile?.idStatus ?? "none",
    disputeFreeze,
  });
}

const requestSchema = z.object({
  action: z.literal("request"),
  orderId: z.string().uuid(),
  method: z.enum(["payoneer", "wise"]),
  destination: z.string().min(3).max(200),
});

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "booster" && role !== "admin") {
    return NextResponse.json({ error: "Boosters only" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const payout = await requestPayout({
      orderId: parsed.data.orderId,
      boosterUserId: session.user.id,
      method: parsed.data.method,
      destination: parsed.data.destination,
    });
    return NextResponse.json({ ok: true, payout });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
