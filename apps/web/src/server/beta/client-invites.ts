import { randomBytes } from "crypto";
import { and, desc, eq, isNull, or, gt } from "drizzle-orm";
import { getDb } from "@/server/db";
import { clientInvites } from "@/server/db/schema";

export async function createClientInvite(opts: {
  createdByUserId: string;
  note?: string;
  expiresAt?: Date;
}) {
  const db = getDb();
  const code = randomBytes(4).toString("hex").toUpperCase();
  const [row] = await db
    .insert(clientInvites)
    .values({
      code,
      createdByUserId: opts.createdByUserId,
      note: opts.note,
      expiresAt: opts.expiresAt,
    })
    .returning();
  return row!;
}

export async function listClientInvites() {
  const db = getDb();
  return db
    .select()
    .from(clientInvites)
    .orderBy(desc(clientInvites.createdAt))
    .limit(50);
}

export async function assertClientInviteAvailable(codeRaw: string) {
  const db = getDb();
  const code = codeRaw.trim().toUpperCase();
  const [invite] = await db
    .select()
    .from(clientInvites)
    .where(eq(clientInvites.code, code))
    .limit(1);

  if (!invite) throw new Error("Invalid invite code");
  if (invite.usedAt) throw new Error("Invite already used");
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    throw new Error("Invite expired");
  }
  return invite;
}

export async function redeemClientInvite(opts: {
  userId: string;
  code: string;
}) {
  const invite = await assertClientInviteAvailable(opts.code);
  const db = getDb();
  const [updated] = await db
    .update(clientInvites)
    .set({ usedByUserId: opts.userId, usedAt: new Date() })
    .where(
      and(eq(clientInvites.id, invite.id), isNull(clientInvites.usedAt)),
    )
    .returning();

  if (!updated) throw new Error("Invite already used");
  return updated;
}

export async function activeClientInvites() {
  const db = getDb();
  return db
    .select()
    .from(clientInvites)
    .where(
      and(
        isNull(clientInvites.usedAt),
        or(
          isNull(clientInvites.expiresAt),
          gt(clientInvites.expiresAt, new Date()),
        ),
      ),
    );
}
