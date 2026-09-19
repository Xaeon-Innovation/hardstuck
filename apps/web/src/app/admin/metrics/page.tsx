"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";

type Metrics = {
  ordersTotal: number;
  paidOrBeyond: number;
  completedOrBeyond: number;
  disputed: number;
  completionRate: number | null;
  disputeRate: number | null;
  medianAssignSec: number | null;
  sampleAssign: number;
};

function fmtPct(n: number | null) {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function fmtAssign(sec: number | null) {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}h`;
}

export default function AdminMetricsPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/metrics")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Forbidden");
          if (r.status === 401 || r.status === 403) router.push("/login");
          return;
        }
        setMetrics(data.metrics);
      })
      .catch(() => setError("Failed to load"));
  }, [router]);

  return (
    <SiteShell>
      <Link
        href="/admin/orders"
        className="text-xs uppercase tracking-wider text-hs-mute hover:text-hs-chalk"
      >
        ← Orders
      </Link>
      <p className="hs-page-kicker mt-4">Ops</p>
      <h1 className="hs-page-title">Metrics</h1>
      <p className="hs-page-lead">
        Soft-launch pulse: assign time, completion, disputes.
      </p>

      {error ? <p className="mt-4 text-hs-danger">{error}</p> : null}
      {!metrics && !error ? (
        <p className="mt-6 text-hs-mute">Loading…</p>
      ) : null}

      {metrics ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["Orders", String(metrics.ordersTotal)],
              ["Paid+", String(metrics.paidOrBeyond)],
              ["Completed+", String(metrics.completedOrBeyond)],
              ["Disputed", String(metrics.disputed)],
              ["Completion rate", fmtPct(metrics.completionRate)],
              ["Dispute rate", fmtPct(metrics.disputeRate)],
              ["Median time-to-assign", fmtAssign(metrics.medianAssignSec)],
              ["Assign sample size", String(metrics.sampleAssign)],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="hs-panel p-4">
              <div className="text-[10px] uppercase tracking-wider text-hs-mute">
                {label}
              </div>
              <div className="mt-1 font-display text-2xl text-hs-signal">
                {value}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </SiteShell>
  );
}
