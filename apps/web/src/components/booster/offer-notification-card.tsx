"use client";

import Link from "next/link";
import type { GameSlug } from "@hardstuck/shared";
import { gameHeroSrc, gameLabel, rankIconSrc } from "@/lib/assets";
import type { BoosterLiveOfferPayload } from "@/lib/booster-live-events";

export type OfferNotification = BoosterLiveOfferPayload & {
  receivedAt?: string;
};

function gameShort(game: string): string {
  const map: Record<string, string> = {
    lol: "LoL",
    valorant: "VAL",
    overwatch: "OW2",
    marvel_rivals: "MR",
    apex: "APEX",
  };
  return map[game] ?? game.toUpperCase();
}

function expiresLabel(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const min = Math.ceil(ms / 60_000);
  return min === 1 ? "1 min left" : `${min} min left`;
}

type Props = {
  item: OfferNotification;
  variant?: "toast" | "feed";
  onAccept?: (offerId: string) => void;
  accepting?: boolean;
  onDismiss?: () => void;
};

export function OfferNotificationCard({
  item,
  variant = "feed",
  onAccept,
  accepting,
  onDismiss,
}: Props) {
  const game = item.order.game as GameSlug;
  const hero = gameHeroSrc(game);
  const isToast = variant === "toast";

  return (
    <article
      className={`hs-notify-card hs-ticket group relative overflow-hidden border border-hs-line/90 ${
        isToast ? "hs-notify-enter" : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hero}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.22] transition-opacity duration-300 group-hover:opacity-[0.32]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-hs-ink via-hs-ink/92 to-hs-ink/75" />
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-hs-signal via-hs-signal/60 to-transparent" />

      <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-hs-signal/40 bg-hs-signal/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-hs-signal">
              <span className="hs-live-dot" aria-hidden />
              Live offer
            </span>
            <span className="text-[10px] uppercase tracking-widest text-hs-steel">
              {gameShort(game)}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-hs-mute">
              {item.order.serviceType}
            </span>
          </div>

          <h3 className="mt-2 font-display text-base uppercase leading-tight text-hs-chalk sm:text-lg">
            {gameLabel(game)} · {item.order.server}
          </h3>

          <div className="mt-3 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rankIconSrc(game, item.order.startRankKey)}
              alt=""
              width={40}
              height={40}
              className="drop-shadow-[0_0_12px_rgba(232,163,23,0.35)]"
            />
            <span className="text-hs-mute">→</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rankIconSrc(game, item.order.endRankKey)}
              alt=""
              width={40}
              height={40}
              className="drop-shadow-[0_0_12px_rgba(232,163,23,0.35)]"
            />
            <span className="ml-1 text-xs text-hs-mute">
              {expiresLabel(item.offer.expiresAt)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-hs-mute">
              Payout
            </div>
            <div className="font-display text-2xl text-hs-signal">
              ${(item.order.amountUsdCents / 100).toFixed(2)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {onAccept ? (
              <button
                type="button"
                disabled={accepting}
                onClick={() => onAccept(item.offer.id)}
                className="hs-btn-primary px-4 py-2 text-xs"
              >
                {accepting ? "…" : "Accept"}
              </button>
            ) : (
              <Link
                href="/notifications"
                className="hs-btn-primary px-4 py-2 text-xs"
              >
                Open queue
              </Link>
            )}
            {onDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                className="hs-btn-ghost px-3 py-2 text-xs"
              >
                Dismiss
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
