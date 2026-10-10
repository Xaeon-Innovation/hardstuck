import { and, eq } from "drizzle-orm";
import type { GameSlug } from "@hardstuck/shared";
import { getDb } from "@/server/db";
import { gameAccounts } from "@/server/db/schema";
import { cacheGet, cacheKey, cacheSet } from "./cache";
import { lookupRank } from "./providers";
import { trackerUrlsFor } from "./trackers";
import type { RankLookupInput, RankLookupResult } from "./types";

export type { RankLookupInput, RankLookupResult };
export { trackerUrlsFor };

export async function getRankLookup(
  input: RankLookupInput,
): Promise<RankLookupResult> {
  const key = cacheKey([
    input.game,
    input.name,
    input.tag,
    input.server,
    input.platform,
  ]);
  const cached = cacheGet<RankLookupResult>(key);
  if (cached) return cached;

  const result = await lookupRank(input);
  // Only cache successful live hits — failed/offline lookups should retry.
  if (result.ok && result.live && !result.error) {
    cacheSet(key, result);
  }
  return result;
}

export async function saveRankSnapshot(opts: {
  userId: string;
  game: GameSlug;
  name?: string;
  tag?: string;
  snapshot: RankLookupResult;
}) {
  const db = getDb();
  const rows = await db
    .select()
    .from(gameAccounts)
    .where(
      and(
        eq(gameAccounts.userId, opts.userId),
        eq(gameAccounts.game, opts.game),
      ),
    );

  const target =
    rows.find(
      (r) =>
        opts.name &&
        opts.tag &&
        r.riotName.toLowerCase() === opts.name.toLowerCase() &&
        r.riotTag.toLowerCase() === opts.tag.toLowerCase(),
    ) ??
    rows.find((r) => r.isPrimary) ??
    rows[0];

  if (!target) return null;

  const [updated] = await db
    .update(gameAccounts)
    .set({
      rankSnapshot: opts.snapshot as unknown as Record<string, unknown>,
      rankSnapshotAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(gameAccounts.id, target.id))
    .returning();
  return updated ?? null;
}
