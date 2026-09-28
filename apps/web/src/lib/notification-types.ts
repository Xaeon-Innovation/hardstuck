export type NotificationItem = {
  id: string;
  kind: "offer" | "order";
  game: string;
  serviceType: string;
  startRankKey: string;
  endRankKey: string;
  server: string;
  amountUsdCents: number;
  status: string;
  orderId: string;
  offerId?: string;
  expiresAt?: string;
  updatedAt: string;
  title: string;
  subtitle: string;
  href: string;
  /** Pay, chat, and run the job from /notifications (no /orders ticket page). */
  workspace?: "booster" | "client";
};

export type NotificationFeed = {
  role: string;
  assignedGames: string[];
  items: NotificationItem[];
};
