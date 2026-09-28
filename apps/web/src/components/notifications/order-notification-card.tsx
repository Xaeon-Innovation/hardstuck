"use client";

import Link from "next/link";
import type { GameSlug } from "@hardstuck/shared";
import { gameHeroSrc, gameLabel, rankIconSrc } from "@/lib/assets";
import type { NotificationItem } from "@/lib/notification-types";

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

function expiresLabel(iso?: string): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const min = Math.ceil(ms / 60_000);
  return min === 1 ? "1 min left" : `${min} min left`;
}

type Props = {
  item: NotificationItem;
  onAccept?: (offerId: string) => void;
  accepting?: boolean;
  variant?: "feed" | "toast";
  /** Booster feed: hide link to order ticket page. */
  hideOrderLink?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  workspace?: React.ReactNode;
};

export function OrderNotificationCard({
  item,
  onAccept,
  accepting,
  variant = "feed",
  hideOrderLink,
  expanded,
  onToggleExpand,
  workspace,
}: Props) {
  const game = item.game as GameSlug;
  const hero = gameHeroSrc(game);
  const expiry = expiresLabel(item.expiresAt);
  const isOffer = item.kind === "offer";

  return (
    <article
      id={item.workspace ? `notify-order-${item.orderId}` : undefined}
      className={`hs-notify-card hs-ticket relative overflow-hidden border border-hs-line/90 ${
        variant === "toast" ? "hs-notify-enter" : ""
      } ${expanded ? "border-hs-signal/40" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hero}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.22]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-hs-ink via-hs-ink/92 to-hs-ink/75" />
      <div
        className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${
          isOffer ? "from-hs-signal" : "from-hs-steel"
        } to-transparent`}
      />

      <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isOffer ? (
              <span className="inline-flex items-center gap-1.5 border border-hs-signal/40 bg-hs-signal/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-hs-signal">
                <span className="hs-live-dot" aria-hidden />
                Live
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-[0.2em] text-hs-steel">
                {item.kind}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-widest text-hs-steel">
              {gameShort(game)}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-hs-mute">
              {item.serviceType}
            </span>
          </div>

          <h3 className="mt-2 font-display text-base uppercase leading-tight text-hs-chalk sm:text-lg">
            {item.title}
          </h3>
          <p className="mt-1 text-sm text-hs-mute">
            {gameLabel(game)} · {item.server} · {item.subtitle}
            {expiry ? ` · ${expiry}` : ""}
          </p>

          <div className="mt-3 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rankIconSrc(game, item.startRankKey)}
              alt=""
              width={36}
              height={36}
            />
            <span className="text-hs-mute">→</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rankIconSrc(game, item.endRankKey)}
              alt=""
              width={36}
              height={36}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-hs-mute">
              {isOffer ? "Payout" : "Total"}
            </div>
            <div className="font-display text-2xl text-hs-signal">
              ${(item.amountUsdCents / 100).toFixed(2)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {isOffer && item.offerId && onAccept ? (
              <button
                type="button"
                disabled={accepting}
                onClick={() => onAccept(item.offerId!)}
                className="hs-btn-primary px-4 py-2 text-xs"
              >
                {accepting ? "…" : "Accept"}
              </button>
            ) : null}
            {item.workspace && onToggleExpand ? (
              <button
                type="button"
                onClick={onToggleExpand}
                className="hs-btn-primary px-4 py-2 text-xs"
              >
                {expanded
                  ? "Close"
                  : item.workspace === "booster"
                    ? "Live chat"
                    : "Open order"}
              </button>
            ) : null}
            {!hideOrderLink && !item.workspace ? (
              <Link href={item.href} className="hs-btn-ghost px-4 py-2 text-xs">
                View
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      {expanded && workspace ? (
        <div className="relative border-t border-hs-line/60 bg-hs-ink/40 px-4 pb-4">
          {workspace}
        </div>
      ) : null}
    </article>
  );
}
