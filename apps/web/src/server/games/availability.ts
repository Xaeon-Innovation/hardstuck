import { eq } from "drizzle-orm";
import { GameSlugs, type GameSlug } from "@hardstuck/shared";
import { getDb } from "@/server/db";
import { gameOverrides } from "@/server/db/schema";
import { boosterCanAcceptMoreOrders } from "@/server/orders/assignment";
import { listApprovedBoosterIdsForGame } from "@/server/trust/service";

export type GameAvailabilityStatus = "open" | "offline";

export type GameAvailability = {
  game: GameSlug;
  status: GameAvailabilityStatus;
  availableBoosters: number;
  forceOffline: boolean;
  reason?: string;
};

/** Count approved online boosters for a game who still have capacity. */
export async function countAvailableBoostersForGame(game: string) {
  const ids = await listApprovedBoosterIdsForGame(game, 40);
  let n = 0;
  for (const id of ids) {
    if (await boosterCanAcceptMoreOrders(id)) n += 1;
  }
  return n;
}

export async function getGameOverride(game: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(gameOverrides)
    .where(eq(gameOverrides.game, game))
    .limit(1);
  return row ?? null;
}

export async function getGameAvailability(
  game: GameSlug,
): Promise<GameAvailability> {
  const override = await getGameOverride(game);
  if (override?.forceOffline) {
    return {
      game,
      status: "offline",
      availableBoosters: 0,
      forceOffline: true,
      reason: override.note ?? "Temporarily offline",
    };
  }

  const availableBoosters = await countAvailableBoostersForGame(game);
  if (availableBoosters < 1) {
    return {
      game,
      status: "offline",
      availableBoosters: 0,
      forceOffline: false,
      reason: "No boosters online",
    };
  }

  return {
    game,
    status: "open",
    availableBoosters,
    forceOffline: false,
  };
}

export async function listGameAvailability(): Promise<GameAvailability[]> {
  const out: GameAvailability[] = [];
  for (const game of GameSlugs) {
    out.push(await getGameAvailability(game));
  }
  return out;
}

export async function assertGameOpenForMatchedPool(game: string) {
  if (!GameSlugs.includes(game as GameSlug)) {
    throw new Error("Unknown game");
  }
  const avail = await getGameAvailability(game as GameSlug);
  if (avail.status !== "open") {
    throw new Error(avail.reason ?? "Game is offline");
  }
  return avail;
}

export async function setGameForceOffline(opts: {
  game: string;
  forceOffline: boolean;
  note?: string;
  updatedByUserId: string;
}) {
  if (!GameSlugs.includes(opts.game as GameSlug)) {
    throw new Error("Unknown game");
  }
  const db = getDb();
  const [row] = await db
    .insert(gameOverrides)
    .values({
      game: opts.game,
      forceOffline: opts.forceOffline,
      note: opts.note ?? null,
      updatedByUserId: opts.updatedByUserId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: gameOverrides.game,
      set: {
        forceOffline: opts.forceOffline,
        note: opts.note ?? null,
        updatedByUserId: opts.updatedByUserId,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row!;
}
