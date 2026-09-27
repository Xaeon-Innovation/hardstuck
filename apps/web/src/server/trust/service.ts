import { randomBytes } from "crypto";
import { and, desc, eq, isNull, or, gt, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  boosterInvites,
  boosterProfiles,
  gameAccounts,
  rankProofs,
  user,
} from "@/server/db/schema";

export async function listGameAccounts(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(gameAccounts)
    .where(eq(gameAccounts.userId, userId))
    .orderBy(desc(gameAccounts.updatedAt));
}

export async function upsertGameAccount(opts: {
  userId: string;
  id?: string;
  game: string;
  riotName: string;
  riotTag: string;
  server: string;
  profileUrl?: string;
  note?: string;
}) {
  const db = getDb();
  const riotName = opts.riotName.trim();
  const riotTag = opts.riotTag.trim().replace(/^#/, "");
  if (!riotName || !riotTag) throw new Error("Riot name and tag required");

  if (opts.id) {
    const [row] = await db
      .update(gameAccounts)
      .set({
        game: opts.game,
        riotName,
        riotTag,
        server: opts.server,
        profileUrl: opts.profileUrl?.trim() || null,
        note: opts.note?.trim() || null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(gameAccounts.id, opts.id), eq(gameAccounts.userId, opts.userId)),
      )
      .returning();
    if (!row) throw new Error("Account not found");
    return row;
  }

  const [row] = await db
    .insert(gameAccounts)
    .values({
      userId: opts.userId,
      game: opts.game,
      riotName,
      riotTag,
      server: opts.server,
      profileUrl: opts.profileUrl?.trim() || null,
      note: opts.note?.trim() || null,
    })
    .returning();
  return row!;
}

export async function deleteGameAccount(userId: string, id: string) {
  const db = getDb();
  await db
    .delete(gameAccounts)
    .where(and(eq(gameAccounts.id, id), eq(gameAccounts.userId, userId)));
}

export async function getBoosterProfile(userId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(boosterProfiles)
    .where(eq(boosterProfiles.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function listApprovedBoosterIds(limit = 20) {
  const db = getDb();
  const rows = await db
    .select({ userId: boosterProfiles.userId })
    .from(boosterProfiles)
    .innerJoin(user, eq(user.id, boosterProfiles.userId))
    .where(
      and(
        eq(boosterProfiles.status, "approved"),
        eq(user.role, "booster"),
        eq(boosterProfiles.queueOnline, true),
      ),
    )
    .limit(limit);
  return rows.map((r) => r.userId);
}

/** Approved boosters whose profile includes this game (offer routing). */
export async function listApprovedBoosterIdsForGame(game: string, limit = 20) {
  const db = getDb();
  const gameJson = JSON.stringify([game]);
  const rows = await db
    .select({ userId: boosterProfiles.userId })
    .from(boosterProfiles)
    .innerJoin(user, eq(user.id, boosterProfiles.userId))
    .where(
      and(
        eq(boosterProfiles.status, "approved"),
        eq(user.role, "booster"),
        eq(boosterProfiles.queueOnline, true),
        sql`${boosterProfiles.games} @> ${gameJson}::jsonb`,
      ),
    )
    .limit(limit);
  return rows.map((r) => r.userId);
}

export async function setBoosterQueueOnline(userId: string, online: boolean) {
  const profile = await getBoosterProfile(userId);
  if (!profile) throw new Error("Booster profile required");
  const db = getDb();
  await db
    .update(boosterProfiles)
    .set({ queueOnline: online, updatedAt: new Date() })
    .where(eq(boosterProfiles.userId, userId));
  return { queueOnline: online };
}

export async function createBoosterInvite(opts: {
  createdByUserId: string;
  note?: string;
  expiresAt?: Date;
}) {
  const db = getDb();
  const code = randomBytes(4).toString("hex").toUpperCase();
  const [row] = await db
    .insert(boosterInvites)
    .values({
      code,
      createdByUserId: opts.createdByUserId,
      note: opts.note,
      expiresAt: opts.expiresAt,
    })
    .returning();
  return row!;
}

export async function listBoosterInvites() {
  const db = getDb();
  return db
    .select()
    .from(boosterInvites)
    .orderBy(desc(boosterInvites.createdAt))
    .limit(50);
}

export async function redeemBoosterInvite(opts: {
  userId: string;
  code: string;
}) {
  const db = getDb();
  const code = opts.code.trim().toUpperCase();
  const [invite] = await db
    .select()
    .from(boosterInvites)
    .where(eq(boosterInvites.code, code))
    .limit(1);

  if (!invite) throw new Error("Invalid invite code");
  if (invite.usedAt) throw new Error("Invite already used");
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    throw new Error("Invite expired");
  }

  await db
    .update(user)
    .set({ role: "booster", updatedAt: new Date() })
    .where(eq(user.id, opts.userId));

  const existing = await getBoosterProfile(opts.userId);
  if (!existing) {
    await db.insert(boosterProfiles).values({
      userId: opts.userId,
      status: "pending",
      invitedByCode: code,
    });
  }

  await db
    .update(boosterInvites)
    .set({ usedByUserId: opts.userId, usedAt: new Date() })
    .where(eq(boosterInvites.id, invite.id));

  return { ok: true as const };
}

export async function listRankProofs(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(rankProofs)
    .where(eq(rankProofs.userId, userId))
    .orderBy(desc(rankProofs.createdAt));
}

export async function submitRankProof(opts: {
  userId: string;
  game: string;
  claimedRankKey: string;
  server: string;
  imagePath: string;
  profileUrl?: string;
}) {
  const db = getDb();
  const profile = await getBoosterProfile(opts.userId);
  if (!profile) throw new Error("Booster profile required — redeem an invite first");

  const [row] = await db
    .insert(rankProofs)
    .values({
      userId: opts.userId,
      game: opts.game,
      claimedRankKey: opts.claimedRankKey,
      server: opts.server,
      imagePath: opts.imagePath,
      profileUrl: opts.profileUrl?.trim() || null,
      status: "pending",
    })
    .returning();

  const games = Array.from(new Set([...(profile.games ?? []), opts.game]));
  await db
    .update(boosterProfiles)
    .set({
      status: "awaiting_review",
      games,
      updatedAt: new Date(),
    })
    .where(eq(boosterProfiles.userId, opts.userId));

  return row!;
}

export async function listPendingTrustReviews() {
  const db = getDb();
  const proofs = await db
    .select({
      proof: rankProofs,
      userName: user.name,
      userEmail: user.email,
      profileStatus: boosterProfiles.status,
    })
    .from(rankProofs)
    .innerJoin(user, eq(user.id, rankProofs.userId))
    .leftJoin(boosterProfiles, eq(boosterProfiles.userId, rankProofs.userId))
    .where(eq(rankProofs.status, "pending"))
    .orderBy(desc(rankProofs.createdAt))
    .limit(100);

  const profiles = await db
    .select({
      profile: boosterProfiles,
      userName: user.name,
      userEmail: user.email,
    })
    .from(boosterProfiles)
    .innerJoin(user, eq(user.id, boosterProfiles.userId))
    .where(
      or(
        eq(boosterProfiles.status, "awaiting_review"),
        eq(boosterProfiles.status, "pending"),
      ),
    )
    .orderBy(desc(boosterProfiles.updatedAt))
    .limit(100);

  return { proofs, profiles };
}

export async function reviewRankProof(opts: {
  proofId: string;
  adminUserId: string;
  decision: "approved" | "rejected";
  note?: string;
}) {
  const db = getDb();
  const [proof] = await db
    .select()
    .from(rankProofs)
    .where(eq(rankProofs.id, opts.proofId))
    .limit(1);
  if (!proof) throw new Error("Proof not found");

  await db
    .update(rankProofs)
    .set({
      status: opts.decision,
      reviewNote: opts.note ?? null,
      reviewedByUserId: opts.adminUserId,
      reviewedAt: new Date(),
    })
    .where(eq(rankProofs.id, opts.proofId));

  if (opts.decision === "approved") {
    await db
      .update(boosterProfiles)
      .set({
        status: "approved",
        reviewNote: opts.note ?? null,
        reviewedByUserId: opts.adminUserId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(boosterProfiles.userId, proof.userId));

    await db
      .update(user)
      .set({ role: "booster", updatedAt: new Date() })
      .where(eq(user.id, proof.userId));
  } else {
    await db
      .update(boosterProfiles)
      .set({
        status: "rejected",
        reviewNote: opts.note ?? null,
        reviewedByUserId: opts.adminUserId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(boosterProfiles.userId, proof.userId));
  }

  return { ok: true as const };
}

/** Unused helper kept for invite expiry sweeps later */
export async function activeUnusedInvites() {
  const db = getDb();
  return db
    .select()
    .from(boosterInvites)
    .where(
      and(
        isNull(boosterInvites.usedAt),
        or(isNull(boosterInvites.expiresAt), gt(boosterInvites.expiresAt, new Date())),
      ),
    );
}
