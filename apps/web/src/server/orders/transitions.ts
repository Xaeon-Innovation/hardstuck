import type { OrderStatus } from "@hardstuck/shared";

/** Allowed transitions for the HardStuck order state machine */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["paid", "cancelled"],
  paid: ["offered", "refunded", "cancelled"],
  offered: ["assigned", "expired_offer", "cancelled"],
  expired_offer: ["offered", "cancelled", "refunded"],
  assigned: ["in_progress", "cancelled", "disputed"],
  in_progress: ["delivered", "disputed", "cancelled"],
  delivered: ["completed", "disputed"],
  completed: ["released", "disputed"],
  released: ["paid_out"],
  paid_out: [],
  disputed: ["completed", "refunded", "in_progress"],
  refunded: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid order transition: ${from} → ${to}`);
  }
}

/** Offer accept window (hybrid assignment) */
export const OFFER_TTL_MS = 15 * 60 * 1000;

/** Client must confirm delivery within this window (else admin is notified). */
export const CLIENT_CONFIRM_DEADLINE_MS = 2 * 60 * 60 * 1000;

/** Client silent after deliver → auto-complete */
export const AUTO_COMPLETE_MS = 48 * 60 * 60 * 1000;

/** Hold after complete before funds become booster-payable */
export const RELEASE_HOLD_MS = 48 * 60 * 60 * 1000;
