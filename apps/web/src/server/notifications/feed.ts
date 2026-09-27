import { desc, eq } from "drizzle-orm";
import { GameSlugs } from "@hardstuck/shared";
import type { Session } from "@/server/auth";
import { hasPlatformWideAccess, isBooster } from "@/lib/roles";
import { getDb } from "@/server/db";
import { boosterProfiles, orders } from "@/server/db/schema";
import {
  listAllOpenOffers,
  listOpenOffersForBooster,
} from "@/server/orders/assignment";
import type { NotificationFeed, NotificationItem } from "@/lib/notification-types";

export type { NotificationFeed, NotificationItem };

function gameAllowed(game: string, assigned: string[] | null): boolean {
  if (!assigned || assigned.length === 0) return true;
  return assigned.includes(game);
}

async function boosterAssignedGames(userId: string): Promise<string[]> {
  const db = getDb();
  const [profile] = await db
    .select({ games: boosterProfiles.games })
    .from(boosterProfiles)
    .where(eq(boosterProfiles.userId, userId))
    .limit(1);
  return profile?.games ?? [];
}

function offerItem(
  row: Awaited<ReturnType<typeof listAllOpenOffers>>[number],
  title: string,
): NotificationItem {
  return {
    id: `offer-${row.offer.id}`,
    kind: "offer",
    game: row.order.game,
    serviceType: row.order.serviceType,
    startRankKey: row.order.startRankKey,
    endRankKey: row.order.endRankKey,
    server: row.order.server,
    amountUsdCents: row.order.amountUsdCents,
    status: row.order.status,
    orderId: row.order.id,
    offerId: row.offer.id,
    expiresAt: row.offer.expiresAt.toISOString(),
    updatedAt: row.offer.expiresAt.toISOString(),
    title,
    subtitle: "Timed offer — accept to claim",
    href: `/notifications?order=${row.order.id}`,
  };
}

function orderItem(
  o: typeof orders.$inferSelect,
  opts: { idPrefix: string; title: string; href: string },
): NotificationItem {
  return {
    id: `${opts.idPrefix}-${o.id}`,
    kind: "order",
    game: o.game,
    serviceType: o.serviceType,
    startRankKey: o.startRankKey,
    endRankKey: o.endRankKey,
    server: o.server,
    amountUsdCents: o.amountUsdCents,
    status: o.status,
    orderId: o.id,
    updatedAt: o.updatedAt.toISOString(),
    title: opts.title,
    subtitle: o.status.replaceAll("_", " "),
    href: opts.href,
  };
}

export async function getNotificationFeed(
  session: Session,
  opts?: { game?: string },
): Promise<NotificationFeed> {
  const db = getDb();
  const role = (session.user as { role?: string }).role ?? "client";
  const userId = session.user.id;
  const gameFilter = opts?.game?.trim();
  const platform = hasPlatformWideAccess(role);

  let assignedGames: string[] = platform ? [...GameSlugs] : [];
  const items: NotificationItem[] = [];
  const seen = new Set<string>();

  function add(item: NotificationItem) {
    if (seen.has(item.id)) return;
    if (gameFilter && item.game !== gameFilter) return;
    seen.add(item.id);
    items.push(item);
  }

  if (platform) {
    const offers = await listAllOpenOffers(120);
    for (const row of offers) {
      add(offerItem(row, "Pool offer"));
    }

    const rows = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.updatedAt))
      .limit(100);

    for (const o of rows) {
      let title = "Platform order";
      if (o.status === "delivered" && o.confirmEscalatedAt) {
        title = "Client confirm overdue";
      } else if (o.status === "delivered") {
        title = "Awaiting client confirm";
      }
      add(
        orderItem(o, {
          idPrefix: "admin-order",
          title,
          href: `/notifications?order=${o.id}`,
        }),
      );
    }
  }

  if (isBooster(role)) {
    assignedGames = await boosterAssignedGames(userId);
    const offers = await listOpenOffersForBooster(userId);
    for (const row of offers) {
      if (!gameAllowed(row.order.game, assignedGames)) continue;
      add(offerItem(row, "New client order"));
    }

    const myOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.boosterUserId, userId))
      .orderBy(desc(orders.updatedAt))
      .limit(50);

    for (const o of myOrders) {
      if (!gameAllowed(o.game, assignedGames)) continue;
      if (o.status === "offered") continue;
      add({
        ...orderItem(o, {
          idPrefix: "order",
          title: "Assigned order",
          href: `/notifications?order=${o.id}`,
        }),
        workspace: "booster",
      });
    }
  }

  if (role === "client" || platform) {
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.clientUserId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(50);

    for (const o of rows) {
      add({
        ...orderItem(o, {
          idPrefix: "client-order",
          title: statusTitleClient(o.status),
          href: `/notifications?order=${o.id}`,
        }),
        workspace: o.clientUserId === userId ? "client" : undefined,
      });
    }
  }

  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return {
    role,
    assignedGames: platform
      ? [...GameSlugs]
      : assignedGames.length > 0
        ? assignedGames
        : Array.from(new Set(items.map((i) => i.game))),
    items,
  };
}

function statusTitleClient(status: string): string {
  switch (status) {
    case "awaiting_payment":
      return "Payment pending";
    case "paid":
    case "offered":
      return "Matching booster";
    case "assigned":
    case "in_progress":
      return "Boost in progress";
    case "delivered":
    case "completed":
      return "Review delivery";
    default:
      return "Your order";
  }
}
