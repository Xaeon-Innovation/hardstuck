"use client";

import { useEffect, useState } from "react";
import type { GameSlug } from "@hardstuck/shared";
import { gameLabel, rankIconSrc } from "@/lib/assets";
import { IconArrow } from "@/components/icons";

type PreviewOrder = {
  id: string;
  status: string;
  game: string;
  serviceType: string;
  startRankKey: string;
  endRankKey: string;
  server: string;
  queue: string;
  divisions: number;
  amountUsdCents: number;
  contractorShareUsdCents: number;
  skuSlug?: string | null;
};

type Props = {
  orderId: string;
  expiresAt?: string;
};

function expiresLabel(iso?: string): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const min = Math.ceil(ms / 60_000);
  return min === 1 ? "1 minute left" : `${min} minutes left`;
}

export function OfferOrderPreview({ orderId, expiresAt }: Props) {
  const [order, setOrder] = useState<PreviewOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrder(null);
    setError(null);
    fetch(`/api/orders/${orderId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Could not load order");
          return;
        }
        setOrder(data.order as PreviewOrder);
      })
      .catch(() => setError("Could not load order"));
  }, [orderId]);

  if (error) {
    return <p className="mt-4 text-sm text-hs-danger">{error}</p>;
  }

  if (!order) {
    return <p className="mt-4 text-sm text-hs-mute">Loading order details…</p>;
  }

  const game = order.game as GameSlug;
  const payout = order.contractorShareUsdCents ?? order.amountUsdCents;

  return (
    <div className="mt-4 space-y-4 border border-hs-line/80 bg-hs-ink/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-widest text-hs-signal">
          Pool offer · {order.status.replaceAll("_", " ")}
        </span>
        <span className="text-xs text-hs-mute">Claim window: {expiresLabel(expiresAt)}</span>
      </div>

      <div className="flex items-center justify-center gap-3 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={rankIconSrc(game, order.startRankKey)}
          alt=""
          width={44}
          height={44}
        />
        <IconArrow className="h-4 w-4 text-hs-signal" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={rankIconSrc(game, order.endRankKey)}
          alt=""
          width={44}
          height={44}
        />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-hs-mute">Game</dt>
          <dd className="text-hs-chalk">{gameLabel(game)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-hs-mute">Service</dt>
          <dd className="text-hs-chalk">{order.serviceType}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-hs-mute">Server</dt>
          <dd className="text-hs-chalk">{order.server}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-hs-mute">Queue</dt>
          <dd className="text-hs-chalk">{order.queue}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-hs-mute">Divisions</dt>
          <dd className="text-hs-chalk">{order.divisions}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-hs-mute">Order total</dt>
          <dd className="text-hs-chalk">${(order.amountUsdCents / 100).toFixed(2)}</dd>
        </div>
      </dl>

      <p className="text-xs text-hs-mute">
        Your share after completion:{" "}
        <span className="font-display text-hs-signal">
          ${(payout / 100).toFixed(2)}
        </span>
        . Client chat and credentials unlock right after you accept.
      </p>
    </div>
  );
}
