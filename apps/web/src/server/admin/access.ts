import { and, count, desc, eq, ilike, ne, or } from "drizzle-orm";
import type { UserRole } from "@hardstuck/shared";
import { getDb } from "@/server/db";
import { adminAuditLog, user } from "@/server/db/schema";

export async function writeAdminAudit(opts: {
  actorUserId: string;
  action: string;
  targetUserId?: string;
  meta?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(adminAuditLog).values({
    actorUserId: opts.actorUserId,
    action: opts.action,
    targetUserId: opts.targetUserId,
    meta: opts.meta ?? {},
  });
}

export async function listUsers(opts: {
  q?: string;
  role?: string;
  limit?: number;
}) {
  const db = getDb();
  const conds = [];
  if (opts.role) conds.push(eq(user.role, opts.role as UserRole));
  if (opts.q) {
    const q = `%${opts.q.replace(/[%_]/g, "")}%`;
    conds.push(or(ilike(user.email, q), ilike(user.name, q))!);
  }
  const where = conds.length ? and(...conds) : undefined;
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      suspendedAt: user.suspendedAt,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(where)
    .orderBy(desc(user.createdAt))
    .limit(opts.limit ?? 100);
}

export async function setUserRole(opts: {
  actorUserId: string;
  targetUserId: string;
  role: UserRole;
}) {
  const db = getDb();
  const [target] = await db
    .select()
    .from(user)
    .where(eq(user.id, opts.targetUserId))
    .limit(1);
  if (!target) throw new Error("User not found");

  if (target.role === "admin" && opts.role !== "admin") {
    const [adminCount] = await db
      .select({ n: count() })
      .from(user)
      .where(and(eq(user.role, "admin"), ne(user.id, opts.targetUserId)));
    if (Number(adminCount?.n ?? 0) < 1) {
      throw new Error("Cannot demote the last admin");
    }
  }

  await db
    .update(user)
    .set({ role: opts.role, updatedAt: new Date() })
    .where(eq(user.id, opts.targetUserId));

  await writeAdminAudit({
    actorUserId: opts.actorUserId,
    action: "set_role",
    targetUserId: opts.targetUserId,
    meta: { from: target.role, to: opts.role },
  });
}

export async function setUserSuspended(opts: {
  actorUserId: string;
  targetUserId: string;
  suspended: boolean;
}) {
  const db = getDb();
  const [target] = await db
    .select()
    .from(user)
    .where(eq(user.id, opts.targetUserId))
    .limit(1);
  if (!target) throw new Error("User not found");
  if (opts.suspended && target.role === "admin") {
    throw new Error("Suspend a demoted admin only after role change");
  }

  await db
    .update(user)
    .set({
      suspendedAt: opts.suspended ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, opts.targetUserId));

  await writeAdminAudit({
    actorUserId: opts.actorUserId,
    action: opts.suspended ? "suspend" : "unsuspend",
    targetUserId: opts.targetUserId,
  });
}

export async function listAuditLog(limit = 50) {
  const db = getDb();
  return db
    .select()
    .from(adminAuditLog)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);
}
