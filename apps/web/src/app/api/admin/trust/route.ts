import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth/session";
import {
  createBoosterInvite,
  listBoosterInvites,
  listPendingTrustReviews,
  reviewRankProof,
} from "@/server/trust/service";
import {
  listPendingIdReviews,
  reviewIdDocument,
} from "@/server/payouts/service";
import {
  createClientInvite,
  listClientInvites,
} from "@/server/beta/client-invites";

async function requireAdmin() {
  const session = await requireSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const [reviews, invites, idReviews, clientInvites] = await Promise.all([
    listPendingTrustReviews(),
    listBoosterInvites(),
    listPendingIdReviews(),
    listClientInvites(),
  ]);
  return NextResponse.json({
    ...reviews,
    invites,
    idReviews,
    clientInvites,
  });
}

const reviewSchema = z.object({
  action: z.literal("review_proof"),
  proofId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(500).optional(),
});

const inviteSchema = z.object({
  action: z.literal("create_invite"),
  note: z.string().max(200).optional(),
});

const idReviewSchema = z.object({
  action: z.literal("review_id"),
  boosterUserId: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate && gate.error) return gate.error;
  const session = gate.session!;

  const body = await req.json().catch(() => null);

  try {
    if (body?.action === "review_proof") {
      const parsed = reviewSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      await reviewRankProof({
        proofId: parsed.data.proofId,
        adminUserId: session.user.id,
        decision: parsed.data.decision,
        note: parsed.data.note,
      });
      return NextResponse.json({ ok: true });
    }

    if (body?.action === "review_id") {
      const parsed = idReviewSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      await reviewIdDocument({
        boosterUserId: parsed.data.boosterUserId,
        adminUserId: session.user.id,
        decision: parsed.data.decision,
        note: parsed.data.note,
      });
      return NextResponse.json({ ok: true });
    }

    if (body?.action === "create_invite") {
      const parsed = inviteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid" }, { status: 400 });
      }
      const invite = await createBoosterInvite({
        createdByUserId: session.user.id,
        note: parsed.data.note,
      });
      return NextResponse.json({ ok: true, invite });
    }

    if (body?.action === "create_client_invite") {
      const invite = await createClientInvite({
        createdByUserId: session.user.id,
        note:
          typeof body.note === "string" ? body.note.slice(0, 200) : "Closed beta",
      });
      return NextResponse.json({ ok: true, invite });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
