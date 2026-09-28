"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

const CLIENT_CONFIRM_MS = 2 * 60 * 60 * 1000;
import { CredentialVault } from "@/components/credential-vault";
import { OrderChat } from "@/components/order-chat";
import { rankIconSrc } from "@/lib/assets";
import { IconArrow } from "@/components/icons";
import { authClient } from "@/lib/auth-client";

type Order = {
  id: string;
  status: string;
  game: string;
  serviceType: string;
  startRankKey: string;
  endRankKey: string;
  server: string;
  amountUsdCents: number;
  releaseAt?: string | null;
  provider?: string | null;
  clientUserId?: string;
  boosterUserId?: string | null;
  deliveredAt?: string | null;
  confirmEscalatedAt?: string | null;
};

type Props = {
  orderId: string;
  onOrderChange?: () => void;
  focusChat?: boolean;
};

export function OrderDetailWorkspace({
  orderId,
  onOrderChange,
  focusChat,
}: Props) {
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentProvider, setPaymentProvider] = useState("manual");
  const [allowSimulatePay, setAllowSimulatePay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(() => {
    fetch(`/api/orders/${orderId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Failed to load");
          return;
        }
        setOrder(data.order);
        if (data.paymentProvider) setPaymentProvider(data.paymentProvider);
        if (typeof data.allowSimulatePay === "boolean") {
          setAllowSimulatePay(data.allowSimulatePay);
        }
        setError(null);
      })
      .catch(() => setError("Failed to load"));
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (order?.status !== "delivered" || !order.deliveredAt) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [order?.status, order?.deliveredAt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") {
      const t = setTimeout(() => {
        load();
        onOrderChange?.();
      }, 1600);
      return () => clearTimeout(t);
    }
  }, [load, onOrderChange]);

  function refresh() {
    load();
    onOrderChange?.();
  }

  function act(action: string) {
    startTransition(async () => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Action failed");
        return;
      }
      if (action === "checkout" && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      refresh();
    });
  }

  function boosterAct(action: "start" | "deliver") {
    startTransition(async () => {
      const res = await fetch("/api/booster/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      refresh();
    });
  }

  const confirmDeadlineLabel = useMemo(() => {
    if (!order || order.status !== "delivered" || !order.deliveredAt) return null;
    const due = new Date(order.deliveredAt).getTime() + CLIENT_CONFIRM_MS;
    const left = due - now;
    if (left <= 0) {
      return order.confirmEscalatedAt
        ? "Confirm window passed — admin notified"
        : "Confirm window passed — admin will be notified shortly";
    }
    const min = Math.ceil(left / 60_000);
    if (min < 60) {
      return min === 1 ? "Confirm within 1 minute" : `Confirm within ${min} minutes`;
    }
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `Confirm within ${h}h ${m}m` : `Confirm within ${h}h`;
  }, [order, now]);

  if (!order && !error) {
    return <p className="pt-4 text-sm text-hs-mute">Loading order…</p>;
  }

  if (!order) {
    return error ? <p className="pt-4 text-sm text-hs-danger">{error}</p> : null;
  }

  const isBoosterOnOrder =
    Boolean(session?.user?.id) && order.boosterUserId === session?.user?.id;
  const isClientOnOrder = order.clientUserId === session?.user?.id;
  const isAdmin = role === "admin";
  const chatOpen = !["draft", "awaiting_payment", "cancelled", "refunded"].includes(
    order.status,
  );

  return (
    <div className="space-y-4 pt-4">
      {error ? <p className="text-sm text-hs-danger">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-widest text-hs-mute">
        <span>{order.status.replaceAll("_", " ")}</span>
        <span className="font-display text-lg text-hs-signal">
          ${(order.amountUsdCents / 100).toFixed(2)}
        </span>
      </div>

      <div className="flex items-center justify-center gap-3 border border-hs-line bg-hs-ink/50 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={rankIconSrc(order.game as "lol" | "valorant", order.startRankKey)}
          alt=""
          width={40}
          height={40}
        />
        <IconArrow className="h-4 w-4 text-hs-signal" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={rankIconSrc(order.game as "lol" | "valorant", order.endRankKey)}
          alt=""
          width={40}
          height={40}
        />
      </div>

      <div className="flex flex-col gap-2">
        {order.status === "awaiting_payment" && isClientOnOrder ? (
          <>
            {paymentProvider === "polar" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => act("checkout")}
                className="hs-btn-primary py-2 text-xs"
              >
                {pending ? "Redirecting…" : "Pay with Polar"}
              </button>
            ) : null}
            {allowSimulatePay ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => act("pay")}
                className="hs-btn-primary py-2 text-xs"
              >
                {pending ? "Processing…" : "Pay now (dev)"}
              </button>
            ) : null}
          </>
        ) : null}
        {order.status === "delivered" && confirmDeadlineLabel ? (
          <p className="text-xs text-hs-mute">{confirmDeadlineLabel}</p>
        ) : null}
        {order.status === "delivered" && isClientOnOrder ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => act("confirm")}
            className="hs-btn-primary py-2 text-xs"
          >
            Confirm completion
          </button>
        ) : null}
        {order.status === "delivered" && isAdmin && !isClientOnOrder ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => act("confirm")}
            className="hs-btn-primary py-2 text-xs"
          >
            Confirm for client (admin)
          </button>
        ) : null}
        {isBoosterOnOrder && order.status === "assigned" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => boosterAct("start")}
            className="hs-btn-primary py-2 text-xs"
          >
            Start boost
          </button>
        ) : null}
        {isBoosterOnOrder && order.status === "in_progress" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => boosterAct("deliver")}
            className="hs-btn-primary py-2 text-xs"
          >
            Mark delivered
          </button>
        ) : null}
        {order.status === "completed" && order.releaseAt ? (
          <p className="text-xs text-hs-mute">
            Release hold until {new Date(order.releaseAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      {order.serviceType === "solo" && (isClientOnOrder || isBoosterOnOrder) ? (
        <CredentialVault orderId={order.id} />
      ) : null}

      {chatOpen ? (
        <OrderChat
          orderId={order.id}
          currentUserId={session?.user?.id}
          boosterAssigned={Boolean(order.boosterUserId)}
          counterpartLabel={isBoosterOnOrder ? "Client" : "Booster"}
          focusOnMount={Boolean(focusChat && isBoosterOnOrder)}
          embedded
        />
      ) : null}

      {role === "admin" && !isClientOnOrder && !isBoosterOnOrder ? (
        <p className="text-xs text-hs-mute">
          Admin view — open booster tools from assigned booster account or use
          admin orders.
        </p>
      ) : null}
    </div>
  );
}
