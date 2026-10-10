"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

type Revenue = {
  days: number;
  totalGmvUsdCents: number;
  totalTakeUsdCents: number;
  boostGmvUsdCents: number;
  boostTakeUsdCents: number;
  marketplaceGmvUsdCents: number;
  marketplaceTakeUsdCents: number;
  escrowOutstandingUsdCents: number;
  payoutsPendingUsdCents: number;
  refundsUsdCents: number;
  refundsCount: number;
  byGame: Record<string, { gmv: number; take: number; count: number }>;
  byCategory: Record<string, { gmv: number; take: number; count: number }>;
};

type Funnel = {
  ordersTotal: number;
  paidOrBeyond: number;
  completedOrBeyond: number;
  disputed: number;
  completionRate: number | null;
  disputeRate: number | null;
  medianAssignSec: number | null;
};

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-hs-mute">
        <span>{label}</span>
        <span>{usd(value)}</span>
      </div>
      <div className="h-2 bg-hs-ink">
        <div
          className="h-full bg-hs-signal/80"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [days, setDays] = useState(30);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/revenue?days=${days}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Failed");
          return;
        }
        setRevenue(data.revenue);
        setFunnel(data.funnel);
      })
      .catch(() => setError("Failed to load"));
  }, [days]);

  const gameMax = Math.max(
    0,
    ...Object.values(revenue?.byGame ?? {}).map((g) => g.gmv),
  );
  const catMax = Math.max(
    0,
    ...Object.values(revenue?.byCategory ?? {}).map((g) => g.gmv),
  );

  return (
    <SiteShell wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hs-page-kicker">Ops</p>
          <h1 className="hs-page-title">Admin dashboard</h1>
          <p className="hs-page-lead">
            Revenue, funnel, and shortcuts into orders, tickets, and access.
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`border px-3 py-1.5 text-[10px] uppercase tracking-widest ${
                days === d
                  ? "border-hs-signal text-hs-signal"
                  : "border-hs-line text-hs-mute"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
        {(
          [
            ["/admin/orders", "Orders"],
            ["/admin/tickets", "Tickets"],
            ["/admin/access", "Access"],
            ["/admin/games", "Games"],
            ["/admin/payouts", "Payouts"],
            ["/admin/trust", "Trust"],
            ["/admin/accounts", "Listings"],
            ["/admin/metrics", "Soft-launch"],
          ] as const
        ).map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="border border-hs-line px-3 py-2 text-hs-mute hover:text-hs-chalk"
          >
            {label}
          </Link>
        ))}
      </div>

      {error ? <p className="mt-4 text-hs-danger">{error}</p> : null}

      {revenue ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["GMV", revenue.totalGmvUsdCents],
              ["Platform take", revenue.totalTakeUsdCents],
              ["Escrow out", revenue.escrowOutstandingUsdCents],
              ["Payouts pending", revenue.payoutsPendingUsdCents],
            ] as const
          ).map(([label, cents]) => (
            <div key={label} className="hs-panel p-4">
              <div className="text-[10px] uppercase tracking-widest text-hs-mute">
                {label}
              </div>
              <div className="mt-1 font-display text-2xl text-hs-chalk">
                {usd(cents)}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {revenue ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="hs-panel space-y-3 p-4">
            <h2 className="font-display text-sm uppercase text-hs-signal">
              By game
            </h2>
            {Object.entries(revenue.byGame).map(([game, row]) => (
              <Bar key={game} label={`${game} (${row.count})`} value={row.gmv} max={gameMax} />
            ))}
            {Object.keys(revenue.byGame).length === 0 ? (
              <p className="text-xs text-hs-mute">No paid volume in range.</p>
            ) : null}
          </div>
          <div className="hs-panel space-y-3 p-4">
            <h2 className="font-display text-sm uppercase text-hs-signal">
              By category
            </h2>
            {Object.entries(revenue.byCategory).map(([cat, row]) => (
              <Bar key={cat} label={`${cat} (${row.count})`} value={row.gmv} max={catMax} />
            ))}
          </div>
        </div>
      ) : null}

      {funnel ? (
        <div className="mt-6 hs-panel grid gap-4 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Orders" value={String(funnel.ordersTotal)} />
          <Stat label="Paid+" value={String(funnel.paidOrBeyond)} />
          <Stat label="Completed+" value={String(funnel.completedOrBeyond)} />
          <Stat label="Disputed" value={String(funnel.disputed)} />
          <Stat
            label="Complete %"
            value={
              funnel.completionRate != null
                ? `${Math.round(funnel.completionRate * 100)}%`
                : "—"
            }
          />
          <Stat
            label="Median assign"
            value={
              funnel.medianAssignSec != null
                ? `${Math.round(funnel.medianAssignSec / 60)}m`
                : "—"
            }
          />
        </div>
      ) : null}

      {revenue ? (
        <p className="mt-4 text-xs text-hs-mute">
          Boost GMV {usd(revenue.boostGmvUsdCents)} (take{" "}
          {usd(revenue.boostTakeUsdCents)}) · Marketplace GMV{" "}
          {usd(revenue.marketplaceGmvUsdCents)} (take{" "}
          {usd(revenue.marketplaceTakeUsdCents)}) · Refunds{" "}
          {usd(revenue.refundsUsdCents)} ({revenue.refundsCount})
        </p>
      ) : null}
    </SiteShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-hs-mute">
        {label}
      </div>
      <div className="font-display text-xl text-hs-chalk">{value}</div>
    </div>
  );
}
