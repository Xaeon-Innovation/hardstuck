import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { user } from "@/server/db/schema";
import { notifyOrderEvent } from "@/server/notifications/email";

export async function listAdminUserIds(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "admin"));
  return rows.map((r) => r.id);
}

export async function notifyAdminsClientConfirmOverdue(opts: {
  orderId: string;
  detail?: string;
}) {
  const adminIds = await listAdminUserIds();
  for (const toUserId of adminIds) {
    await notifyOrderEvent({
      toUserId,
      orderId: opts.orderId,
      event: "client_confirm_overdue",
      detail: opts.detail,
    });
  }
  return adminIds.length;
}
