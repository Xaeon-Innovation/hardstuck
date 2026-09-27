"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";

type OrderRow = {
  id: string;
  status: string;
  game: string;
  serviceType: string;
  amountUsdCents: number;
  clientUserId: string;
  boosterUserId: string | null;
  createdAt: string;
  startRankKey: string;
  endRankKey: string;
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    fetch("/api/admin/orders")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Forbidden");
          if (r.status === 401 || r.status === 403) router.push("/login");
          return;
        }
        setOrders(data.orders ?? []);
      })
      .catch(() => setError("Failed to load"));
  }

  useEffect(() => {
    load();
  }, []);

  function act(action: string, orderId?: string) {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return;
      }
      setError(null);
      setMessage(
        action === "run_timers"
          ? `Timers: expired ${data.expiredOffers}, escalated ${data.confirmEscalated ?? 0}, auto ${data.autoCompleted}, released ${data.released}`
          : "Done",
      );
      load();
    });
  }

  return (
    <SiteShell wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hs-page-kicker">Ops</p>
          <h1 className="hs-page-title">Orders</h1>
          <p className="hs-page-lead">
            Mark paid, refund, dispute, re-offer, run timer sweep.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => act("run_timers")}
          className="hs-btn-ghost"
        >
          Run timers
        </button>
      </div>

        {error ? <p className="mt-4 text-hs-danger">{error}</p> : null}
        {message ? <p className="mt-4 text-hs-ok">{message}</p> : null}

        <div className="hs-scroll mt-6 max-h-[70vh] space-y-2 overflow-y-auto">
          {orders.map((o) => (
            <div
              key={o.id}
              className="hs-panel flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <Link
                  href={`/notifications?order=${o.id}`}
                  className="font-mono text-xs text-hs-signal underline"
                >
                  {o.id.slice(0, 8)}…
                </Link>
                <p className="mt-1 text-sm text-hs-chalk">
                  {o.game} · {o.serviceType} · {o.status}
                </p>
                <p className="text-xs text-hs-mute">
                  ${(o.amountUsdCents / 100).toFixed(2)} · {o.startRankKey} →{" "}
                  {o.endRankKey}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {o.status === "awaiting_payment" ? (
                  <button
                    type="button"
                    className="hs-btn-primary px-3 py-1.5 text-[10px]"
                    onClick={() => act("mark_paid", o.id)}
                  >
                    Mark paid
                  </button>
                ) : null}
                {o.status === "delivered" ? (
                  <button
                    type="button"
                    className="hs-btn-primary px-3 py-1.5 text-[10px]"
                    onClick={() => act("confirm", o.id)}
                  >
                    Confirm delivery
                  </button>
                ) : null}
                {["paid", "expired_offer"].includes(o.status) ? (
                  <button
                    type="button"
                    className="hs-btn-ghost px-3 py-1.5 text-[10px]"
                    onClick={() => act("reoffer", o.id)}
                  >
                    Re-offer
                  </button>
                ) : null}
                <button
                  type="button"
                  className="hs-btn-ghost px-3 py-1.5 text-[10px]"
                  onClick={() => act("dispute", o.id)}
                >
                  Dispute
                </button>
                <button
                  type="button"
                  className="border border-hs-danger/40 px-3 py-1.5 text-[10px] uppercase tracking-wider text-hs-danger"
                  onClick={() => act("refund", o.id)}
                >
                  Refund
                </button>
              </div>
            </div>
          ))}
          {orders.length === 0 ? (
            <p className="text-hs-mute">No orders yet.</p>
          ) : null}
        </div>
    </SiteShell>
  );
}
