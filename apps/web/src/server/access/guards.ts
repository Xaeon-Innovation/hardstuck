import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { user } from "@/server/db/schema";

export async function assertUserNotSuspended(
  userId: string,
): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ suspendedAt: user.suspendedAt })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (row?.suspendedAt) {
    return "Account suspended";
  }
  return null;
}

export async function getUserAccess(userId: string) {
  const db = getDb();
  const [row] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  return row ?? null;
}
