import { and, eq, inArray, isNull, lte, isNotNull, ne } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  orderCredentials,
  orders,
  vaultAccessLogs,
} from "@/server/db/schema";
import { decryptSecret, encryptSecret } from "./crypto";

/** Wipe Solo secrets this long after release (unless disputed). */
export const VAULT_WIPE_AFTER_MS = 48 * 60 * 60 * 1000;

export type CredentialPayload = {
  username: string;
  password: string;
  note?: string;
};

export async function getCredentialMeta(orderId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: orderCredentials.id,
      label: orderCredentials.label,
      wipedAt: orderCredentials.wipedAt,
      createdAt: orderCredentials.createdAt,
      updatedAt: orderCredentials.updatedAt,
    })
    .from(orderCredentials)
    .where(eq(orderCredentials.orderId, orderId))
    .limit(1);
  return row ?? null;
}

export async function depositCredentials(opts: {
  orderId: string;
  userId: string;
  payload: CredentialPayload;
  label?: string;
}) {
  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, opts.orderId))
    .limit(1);
  if (!order) throw new Error("Order not found");
  if (order.serviceType !== "solo") {
    throw new Error("Vault is only for Solo orders");
  }
  if (order.clientUserId !== opts.userId) {
    throw new Error("Only the Client can deposit credentials");
  }
  if (
    !["assigned", "in_progress", "delivered", "paid", "offered"].includes(
      order.status,
    )
  ) {
    throw new Error("Order is not ready for credentials");
  }

  const blob = encryptSecret(JSON.stringify(opts.payload));
  const existing = await getCredentialMeta(opts.orderId);

  if (existing?.wipedAt) {
    throw new Error("Credentials were wiped for this order");
  }

  if (existing) {
    await db
      .update(orderCredentials)
      .set({
        ciphertext: blob.ciphertext,
        iv: blob.iv,
        authTag: blob.authTag,
        label: opts.label ?? existing.label,
        updatedAt: new Date(),
      })
      .where(eq(orderCredentials.orderId, opts.orderId));
  } else {
    await db.insert(orderCredentials).values({
      orderId: opts.orderId,
      ciphertext: blob.ciphertext,
      iv: blob.iv,
      authTag: blob.authTag,
      label: opts.label,
    });
  }

  await db.insert(vaultAccessLogs).values({
    orderId: opts.orderId,
    userId: opts.userId,
    action: "deposit",
  });

  return { ok: true as const };
}

export async function revealCredentials(opts: {
  orderId: string;
  userId: string;
  role?: string;
}) {
  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, opts.orderId))
    .limit(1);
  if (!order) throw new Error("Order not found");
  if (order.serviceType !== "solo") {
    throw new Error("Vault is only for Solo orders");
  }

  const isBooster = order.boosterUserId === opts.userId;
  const isAdmin = opts.role === "admin";
  if (!isBooster && !isAdmin) {
    throw new Error("Only assigned Booster or Admin can reveal");
  }
  if (
    !isAdmin &&
    !["assigned", "in_progress", "delivered"].includes(order.status)
  ) {
    throw new Error("Credentials locked for this status");
  }

  const [row] = await db
    .select()
    .from(orderCredentials)
    .where(eq(orderCredentials.orderId, opts.orderId))
    .limit(1);
  if (!row || row.wipedAt) {
    throw new Error("No credentials on file");
  }

  const plaintext = decryptSecret({
    ciphertext: row.ciphertext,
    iv: row.iv,
    authTag: row.authTag,
  });
  const payload = JSON.parse(plaintext) as CredentialPayload;

  await db.insert(vaultAccessLogs).values({
    orderId: opts.orderId,
    userId: opts.userId,
    action: "reveal",
  });

  return payload;
}

export async function wipeCredentials(opts: {
  orderId: string;
  userId?: string | null;
  reason?: string;
}) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(orderCredentials)
    .where(eq(orderCredentials.orderId, opts.orderId))
    .limit(1);
  if (!row || row.wipedAt) return { wiped: false as const };

  await db
    .update(orderCredentials)
    .set({
      ciphertext: "",
      iv: "",
      authTag: "",
      wipedAt: new Date(),
      updatedAt: new Date(),
      label: opts.reason ? `wiped:${opts.reason}` : row.label,
    })
    .where(eq(orderCredentials.orderId, opts.orderId));

  await db.insert(vaultAccessLogs).values({
    orderId: opts.orderId,
    userId: opts.userId ?? null,
    action: "wipe",
  });

  return { wiped: true as const };
}

/** Cron: wipe released Solo vaults after retention; skip disputed. */
export async function wipeDueCredentials(now = new Date()) {
  const db = getDb();
  const cutoff = new Date(now.getTime() - VAULT_WIPE_AFTER_MS);
  let wiped = 0;

  const due = await db
    .select({ orderId: orders.id })
    .from(orders)
    .innerJoin(orderCredentials, eq(orderCredentials.orderId, orders.id))
    .where(
      and(
        isNull(orderCredentials.wipedAt),
        ne(orders.status, "disputed"),
        isNotNull(orders.releasedAt),
        lte(orders.releasedAt, cutoff),
      ),
    );

  for (const row of due) {
    const result = await wipeCredentials({
      orderId: row.orderId,
      reason: "retention",
    });
    if (result.wiped) wiped += 1;
  }

  const terminal = await db
    .select({ orderId: orders.id })
    .from(orders)
    .innerJoin(orderCredentials, eq(orderCredentials.orderId, orders.id))
    .where(
      and(
        isNull(orderCredentials.wipedAt),
        inArray(orders.status, ["cancelled", "refunded"]),
      ),
    );

  for (const row of terminal) {
    const result = await wipeCredentials({
      orderId: row.orderId,
      reason: "terminal",
    });
    if (result.wiped) wiped += 1;
  }

  return { wiped };
}
