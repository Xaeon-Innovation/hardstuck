import { NextResponse } from "next/server";
import { z } from "zod";
import { GameSlugs } from "@hardstuck/shared";
import { requireSession } from "@/server/auth/session";
import {
  deleteGameAccount,
  getBoosterProfile,
  listGameAccounts,
  listRankProofs,
  redeemBoosterInvite,
  submitRankProof,
  upsertGameAccount,
} from "@/server/trust/service";
import { saveIdDocumentImage, saveRankProofImage } from "@/server/trust/upload";
import { submitIdDocument } from "@/server/payouts/service";
import {
  rateLimit,
  rateLimitResponse,
} from "@/server/security/rate-limit";

export async function GET() {
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [accounts, proofs, boosterProfile] = await Promise.all([
    listGameAccounts(session.user.id),
    listRankProofs(session.user.id),
    getBoosterProfile(session.user.id),
  ]);

  return NextResponse.json({
    accounts,
    proofs,
    boosterProfile,
    role: (session.user as { role?: string }).role,
  });
}

const accountSchema = z.object({
  action: z.literal("upsert_account"),
  id: z.string().uuid().optional(),
  game: z.enum(GameSlugs),
  riotName: z.string().min(1).max(40),
  riotTag: z.string().min(1).max(16),
  server: z.string().min(1).max(32),
  profileUrl: z.string().max(500).optional(),
  note: z.string().max(300).optional(),
});

const deleteSchema = z.object({
  action: z.literal("delete_account"),
  id: z.string().uuid(),
});

const inviteSchema = z.object({
  action: z.literal("redeem_invite"),
  code: z.string().min(4).max(32),
});

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit({
    key: `trust:${session.user.id}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const contentType = req.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const action = String(form.get("action") ?? "");
      const file = form.get("image");
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "Image required" }, { status: 400 });
      }

      if (action === "submit_id") {
        const imagePath = await saveIdDocumentImage(file);
        await submitIdDocument({
          userId: session.user.id,
          imagePath,
        });
        return NextResponse.json({ ok: true });
      }

      if (action !== "submit_rank_proof") {
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
      }
      const imagePath = await saveRankProofImage(file);
      const proof = await submitRankProof({
        userId: session.user.id,
        game: String(form.get("game") ?? ""),
        claimedRankKey: String(form.get("claimedRankKey") ?? ""),
        server: String(form.get("server") ?? ""),
        imagePath,
        profileUrl: String(form.get("profileUrl") ?? "") || undefined,
      });
      return NextResponse.json({ ok: true, proof });
    }

    const body = await req.json().catch(() => null);
    const action = body?.action;

    if (action === "upsert_account") {
      const parsed = accountSchema.safeParse(body);
      if (!parsed.success) {
        const fieldMsg = Object.entries(parsed.error.flatten().fieldErrors)
          .map(([k, v]) => `${k}: ${(v ?? []).join(", ")}`)
          .join("; ");
        return NextResponse.json(
          { error: fieldMsg || "Invalid account data" },
          { status: 400 },
        );
      }
      const account = await upsertGameAccount({
        userId: session.user.id,
        id: parsed.data.id,
        game: parsed.data.game,
        riotName: parsed.data.riotName,
        riotTag: parsed.data.riotTag,
        server: parsed.data.server,
        profileUrl: parsed.data.profileUrl || undefined,
        note: parsed.data.note,
      });
      return NextResponse.json({ ok: true, account });
    }

    if (action === "delete_account") {
      const parsed = deleteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid" }, { status: 400 });
      }
      await deleteGameAccount(session.user.id, parsed.data.id);
      return NextResponse.json({ ok: true });
    }

    if (action === "redeem_invite") {
      const parsed = inviteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid code" }, { status: 400 });
      }
      await redeemBoosterInvite({
        userId: session.user.id,
        code: parsed.data.code,
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
