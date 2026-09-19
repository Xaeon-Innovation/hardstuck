import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { user } from "@/server/db/schema";

export type NotifyEvent =
  | "order_paid"
  | "order_offered"
  | "order_assigned"
  | "order_delivered"
  | "order_completed"
  | "order_disputed"
  | "chat_message"
  | "account_sale";

/**
 * Email notifications: Resend when RESEND_API_KEY is set; otherwise console.
 */
export async function notifyOrderEvent(opts: {
  toUserId: string;
  orderId: string;
  event: NotifyEvent;
  detail?: string;
}) {
  const db = getDb();
  const [u] = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, opts.toUserId))
    .limit(1);

  const subject = `[HardStuck] ${opts.event.replace(/_/g, " ")}`;
  const text = `Hello ${u?.name ?? "there"},\n\nEvent: ${opts.event}\nOrder: ${opts.orderId}${
    opts.detail ? `\nDetail: ${opts.detail}` : ""
  }\n\n— HardStuck`;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM ?? "HardStuck <noreply@hardstuck.gg>";

  if (apiKey && u?.email) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [u.email],
          subject,
          text,
        }),
      });
      if (!res.ok) {
        console.warn("[notify] Resend failed", await res.text());
      }
      return { queued: true as const, email: u.email, provider: "resend" };
    } catch (e) {
      console.warn("[notify] Resend error", e);
    }
  }

  const line = `[notify] ${opts.event} → ${u?.email ?? opts.toUserId} order=${opts.orderId}${
    opts.detail ? ` | ${opts.detail}` : ""
  }`;
  if (process.env.NODE_ENV !== "test") {
    console.info(line);
  }

  return { queued: true as const, email: u?.email ?? null, provider: "console" };
}
