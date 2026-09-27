import { asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { orderMessages, orders, user } from "@/server/db/schema";
import { notifyOrderEvent } from "@/server/notifications/email";
import { publishOrderChatUpdate } from "@/server/notifications/order-chat-live";

const MAX_BODY = 4000;

export async function assertOrderChatAccess(opts: {
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

  const isOwner = order.clientUserId === opts.userId;
  const isBooster = order.boosterUserId === opts.userId;
  const isAdmin = opts.role === "admin";
  if (!isOwner && !isBooster && !isAdmin) {
    throw new Error("Forbidden");
  }
  return order;
}

export async function listMessages(orderId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: orderMessages.id,
      body: orderMessages.body,
      createdAt: orderMessages.createdAt,
      senderUserId: orderMessages.senderUserId,
      senderName: user.name,
      senderImage: user.image,
    })
    .from(orderMessages)
    .leftJoin(user, eq(user.id, orderMessages.senderUserId))
    .where(eq(orderMessages.orderId, orderId))
    .orderBy(asc(orderMessages.createdAt))
    .limit(200);
  return rows;
}

export async function postMessage(opts: {
  orderId: string;
  senderUserId: string;
  role?: string;
  body: string;
}) {
  const trimmed = opts.body.trim();
  if (!trimmed) throw new Error("Message is empty");
  if (trimmed.length > MAX_BODY) throw new Error("Message too long");

  const order = await assertOrderChatAccess({
    orderId: opts.orderId,
    userId: opts.senderUserId,
    role: opts.role,
  });

  if (
    ["draft", "awaiting_payment", "cancelled", "refunded"].includes(order.status)
  ) {
    throw new Error("Chat not available for this order status");
  }

  const isAdmin = opts.role === "admin";
  const isClient = order.clientUserId === opts.senderUserId;
  if (!order.boosterUserId && isClient && !isAdmin) {
    throw new Error("Live chat opens when a booster accepts your order");
  }

  const db = getDb();
  const [row] = await db
    .insert(orderMessages)
    .values({
      orderId: opts.orderId,
      senderUserId: opts.senderUserId,
      body: trimmed,
    })
    .returning();

  const recipientIds = [order.clientUserId, order.boosterUserId].filter(
    (id): id is string => Boolean(id) && id !== opts.senderUserId,
  );
  for (const toUserId of recipientIds) {
    await notifyOrderEvent({
      toUserId,
      orderId: order.id,
      event: "chat_message",
      detail: trimmed.slice(0, 120),
    });
  }

  publishOrderChatUpdate(order.id, { type: "message.new", messageId: row!.id });

  return row!;
}

/** First message when booster accepts — opens the conversation. */
export async function postBoosterAssignedWelcome(opts: {
  orderId: string;
  boosterUserId: string;
}) {
  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, opts.orderId))
    .limit(1);
  if (!order || order.boosterUserId !== opts.boosterUserId) return;

  const [existing] = await db
    .select({ id: orderMessages.id })
    .from(orderMessages)
    .where(eq(orderMessages.orderId, opts.orderId))
    .limit(1);
  if (existing) return;

  const body =
    "I've accepted your order. Use this chat for updates, credentials, and questions — I'll keep you posted on progress.";
  const [row] = await db
    .insert(orderMessages)
    .values({
      orderId: opts.orderId,
      senderUserId: opts.boosterUserId,
      body,
    })
    .returning();

  await notifyOrderEvent({
    toUserId: order.clientUserId,
    orderId: order.id,
    event: "order_assigned",
    detail: "Booster is ready — live chat is open",
  });

  publishOrderChatUpdate(order.id, { type: "message.new", messageId: row!.id });
}
