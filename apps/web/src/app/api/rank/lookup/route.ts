import { NextResponse } from "next/server";
import { GameSlugs, type GameSlug } from "@hardstuck/shared";
import { requireSession } from "@/server/auth/session";
import { getRankLookup, saveRankSnapshot } from "@/server/rank";
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
    key: `rank:${session.user.id}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const body = await req.json().catch(() => null);
  const game = String(body?.game ?? "");
  const name = String(body?.name ?? "").trim();
  const tag = String(body?.tag ?? "").trim();
  const server = body?.server ? String(body.server) : undefined;
  const platform = body?.platform ? String(body.platform) : undefined;
  const save = Boolean(body?.save);
  const manual = body?.manualSnapshot;

  if (!GameSlugs.includes(game as GameSlug) || !name) {
    return NextResponse.json(
      { error: "game and name are required" },
      { status: 400 },
    );
  }

  // Persist a user-chosen rank when live APIs can't resolve the player.
  if (manual && typeof manual === "object" && save) {
    const snapshot = {
      ...manual,
      ok: true,
      game,
      displayName:
        typeof manual.displayName === "string"
          ? manual.displayName
          : tag
            ? `${name}#${tag}`
            : name,
      provider:
        typeof manual.provider === "string" ? manual.provider : "manual",
      fetchedAt:
        typeof manual.fetchedAt === "string"
          ? manual.fetchedAt
          : new Date().toISOString(),
    };
    await saveRankSnapshot({
      userId: session.user.id,
      game: game as GameSlug,
      name,
      tag,
      snapshot: snapshot as Parameters<typeof saveRankSnapshot>[0]["snapshot"],
    });
    return NextResponse.json({ result: snapshot });
  }

  const result = await getRankLookup({
    game: game as GameSlug,
    name,
    tag: tag || undefined,
    server,
    platform,
  });

  if (save && result.ok) {
    await saveRankSnapshot({
      userId: session.user.id,
      game: game as GameSlug,
      name,
      tag,
      snapshot: result,
    });
  }

  return NextResponse.json({ result });
}
