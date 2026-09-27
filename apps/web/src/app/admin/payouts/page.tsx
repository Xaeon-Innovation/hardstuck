"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";

type Row = {
  payout: {
    id: string;
    amountUsdCents: number;
    method: string;
    destination: string;
    status: string;
    createdAt: string;
  };
  order: {
    id: string;
    game: string;
    serviceType: string;
  };
  boosterName: string;
  boosterEmail: string;
};

export default function AdminPayoutsPage() {
  const router = useRouter();
  const [payouts, setPayouts] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    fetch("/api/admin/payouts?status=pending")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Forbidden");
          if (r.status === 401 || r.status === 403) router.push("/login");
          return;
        }
        setPayouts(data.payouts ?? []);
      })
      .catch(() => setError("Failed to load"));
  }

  useEffect(() => {
    load();
  }, []);

  function act(action: "mark_paid" | "reject", payoutId: string) {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payoutId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      setError(null);
      setMessage(action === "mark_paid" ? "Marked paid_out." : "Rejected.");
      load();
    });
  }

  return (
    <SiteShell wide>
      <Link
        href="/admin/orders"
        className="text-xs uppercase tracking-wider text-hs-mute hover:text-hs-chalk"
      >
        ← Orders
      </Link>
      <p className="hs-page-kicker mt-4">Ops</p>
      <h1 className="hs-page-title">Payouts</h1>
      <p className="hs-page-lead">
        Payoneer / Wise queue — mark paid after you send funds.
      </p>

      {error ? <p className="mt-4 text-hs-danger">{error}</p> : null}
      {message ? <p className="mt-4 text-hs-ok">{message}</p> : null}

      <div className="mt-8 space-y-3">
        {payouts.length === 0 ? (
          <p className="hs-panel p-6 text-hs-mute">No pending payouts.</p>
        ) : (
          payouts.map(({ payout, order, boosterName, boosterEmail }) => (
            <div
              key={payout.id}
              className="hs-panel flex flex-wrap items-center justify-between gap-4 p-4"
            >
              <div>
                <div className="text-hs-chalk">
                  {boosterName}{" "}
                  <span className="text-hs-mute">({boosterEmail})</span>
                </div>
                <div className="mt-1 text-sm text-hs-mute">
                  {order.game} · {order.serviceType} ·{" "}
                  <Link
                    href={`/notifications?order=${order.id}`}
                    className="text-hs-signal underline"
                  >
                    order
                  </Link>
                </div>
                <div className="mt-1 text-sm text-hs-chalk">
                  {payout.method.toUpperCase()} → {payout.destination}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-xl text-hs-signal">
                  ${(payout.amountUsdCents / 100).toFixed(2)}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act("mark_paid", payout.id)}
                  className="hs-btn-primary px-3 py-2 text-xs"
                >
                  Mark paid
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act("reject", payout.id)}
                  className="border border-hs-danger/50 px-3 py-2 text-xs uppercase tracking-widest text-hs-danger disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </SiteShell>
  );
}
