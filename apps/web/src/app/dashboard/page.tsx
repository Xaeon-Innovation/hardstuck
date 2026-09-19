"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { rankIconSrc } from "@/lib/assets";

type OrderRow = {
  id: string;
  status: string;
  game: string;
  serviceType: string;
  startRankKey: string;
  endRankKey: string;
  amountUsdCents: number;
  createdAt: string;
};

export default function ClientDashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Failed");
          if (r.status === 401) router.push("/login");
          return;
        }
        setOrders(data.orders ?? []);
      })
      .catch(() => setError("Failed to load orders"));
  }, [router]);

  return (
    <SiteShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hs-page-kicker">Client</p>
          <h1 className="hs-page-title">Your orders</h1>
          <p className="hs-page-lead">
            Track status, open chat, and manage Solo vault deposits.
          </p>
        </div>
        <Link href="/boost" className="hs-btn-primary">
          New boost
        </Link>
      </div>

      {error ? <p className="mt-4 text-hs-danger">{error}</p> : null}

      <div className="mt-8 space-y-3">
        {orders.length === 0 && !error ? (
          <p className="hs-panel p-8 text-center text-hs-mute">
            No orders yet.{" "}
            <Link href="/boost" className="text-hs-signal underline">
              Open the calculator
            </Link>
          </p>
        ) : (
          orders.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="hs-panel flex flex-wrap items-center justify-between gap-4 p-4 transition hover:border-hs-signal/40"
            >
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rankIconSrc(
                    o.game as "lol" | "valorant",
                    o.startRankKey,
                  )}
                  alt=""
                  width={36}
                  height={36}
                />
                <span className="text-hs-mute">→</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rankIconSrc(
                    o.game as "lol" | "valorant",
                    o.endRankKey,
                  )}
                  alt=""
                  width={36}
                  height={36}
                />
                <div className="ml-2">
                  <div className="text-sm text-hs-chalk">
                    {o.game.toUpperCase()} · {o.serviceType}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-hs-mute">
                    {o.status.replaceAll("_", " ")}
                  </div>
                </div>
              </div>
              <div className="font-display text-lg text-hs-signal">
                ${(o.amountUsdCents / 100).toFixed(2)}
              </div>
            </Link>
          ))
        )}
      </div>
    </SiteShell>
  );
}
