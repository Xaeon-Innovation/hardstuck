"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CATALOGS, type GameSlug } from "@hardstuck/shared";
import { apexDivisionLabel, rankIconSrc } from "@/lib/assets";
import {
  gameIdentityFields,
  platformFromServer,
} from "@/lib/game-identity";

export type RankStatsView = {
  ok: boolean;
  live: boolean;
  displayName: string;
  rankLabel: string | null;
  lpOrRr: number | null;
  wins: number | null;
  losses: number | null;
  peakLabel: string | null;
  topUnits: { name: string; games?: number; winRate?: number }[];
  trackerUrls: { label: string; url: string }[];
  provider: string;
  fetchedAt: string;
  error?: string;
  rankKeyHint?: string | null;
};

function rankKeyFromLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  const cleaned = label.toLowerCase().replace(/\s+/g, "_").trim();
  return cleaned || null;
}

type Props = {
  game: GameSlug;
  defaultName?: string;
  defaultTag?: string;
  defaultServer?: string;
  /** When set, skip name/tag inputs — parent owns identity fields. */
  embedded?: boolean;
  initialResult?: RankStatsView | null;
  onConfirmRank?: (hint: string, result: RankStatsView) => void;
  onResult?: (result: RankStatsView) => void;
  compact?: boolean;
  /** Let the user pick a catalog rank when live APIs miss (e.g. Apex Mozambique). */
  allowManualRank?: boolean;
  /** When name/tag arrive from a linked profile, look up once and push via onResult. */
  autoLookup?: boolean;
};

export function RankStatsPanel({
  game,
  defaultName = "",
  defaultTag = "",
  defaultServer,
  embedded,
  initialResult = null,
  onConfirmRank,
  onResult,
  compact,
  allowManualRank,
  autoLookup,
}: Props) {
  const [name, setName] = useState(defaultName);
  const [tag, setTag] = useState(defaultTag);
  const [result, setResult] = useState<RankStatsView | null>(initialResult);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [manualKey, setManualKey] = useState("");
  const identity = gameIdentityFields(game);
  const catalogRanks = CATALOGS[game]?.ranks ?? [];
  const autoKeyRef = useRef("");

  useEffect(() => {
    setName(defaultName);
    setTag(defaultTag);
    autoKeyRef.current = "";
  }, [defaultName, defaultTag, game]);

  useEffect(() => {
    // Never let a stale cached snapshot overwrite a fresher live result.
    setResult((prev) => {
      if (
        prev?.live &&
        initialResult &&
        !initialResult.live &&
        prev.fetchedAt &&
        initialResult.fetchedAt &&
        new Date(prev.fetchedAt) >= new Date(initialResult.fetchedAt)
      ) {
        return prev;
      }
      if (prev?.live && initialResult?.live && prev.fetchedAt && initialResult.fetchedAt) {
        return new Date(prev.fetchedAt) >= new Date(initialResult.fetchedAt)
          ? prev
          : initialResult;
      }
      return initialResult ?? prev;
    });
  }, [initialResult]);

  function lookup(
    save = true,
    override?: { name?: string; tag?: string },
  ) {
    const n = (override?.name ?? (embedded ? defaultName : name)).trim();
    const t = (override?.tag ?? (embedded ? defaultTag : tag)).trim();
    if (!n) {
      setError(identity.lookupHint);
      return;
    }
    if (identity.tagRequired && !t) {
      setError(identity.tagPlaceholder);
      return;
    }
    setError(null);
    start(async () => {
      const res = await fetch("/api/rank/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game,
          name: n,
          // Always send a tag when the user provided one (UID, Riot tag, etc.).
          tag: t || undefined,
          server: defaultServer,
          platform: platformFromServer(game, defaultServer),
          save,
        }),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Lookup failed",
        );
        return;
      }
      const next = data.result as RankStatsView;
      setResult(next);
      onResult?.(next);
    });
  }

  useEffect(() => {
    if (!autoLookup) return;
    const n = defaultName.trim();
    const t = defaultTag.trim();
    if (!n) return;
    if (identity.tagRequired && !t) return;
    const key = `${game}|${n}|${t}|${defaultServer ?? ""}`;
    if (autoKeyRef.current === key) return;
    autoKeyRef.current = key;
    lookup(true, { name: n, tag: t });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLookup, defaultName, defaultTag, game, defaultServer]);

  return (
    <div className={`hs-panel ${compact ? "p-3" : "p-4"}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-widest text-hs-mute">
          Live rank & stats
        </div>
        {result ? (
          <span
            className={`text-[10px] uppercase tracking-widest ${
              result.live ? "text-hs-ok" : "text-hs-mute"
            }`}
          >
            {result.live ? "Live" : result.ok ? "Cached" : "Offline"}
          </span>
        ) : null}
      </div>

      {embedded ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-hs-chalk">
            {defaultName}
            {defaultTag ? `#${defaultTag}` : ""}
          </span>
          <button
            type="button"
            disabled={pending || !defaultName.trim()}
            onClick={() => lookup(true)}
            className="border border-hs-signal/60 px-3 py-1.5 text-[10px] uppercase tracking-widest text-hs-signal hover:bg-hs-signal/10 disabled:opacity-40"
          >
            {pending ? "…" : result ? "Refresh" : "Look up"}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={identity.namePlaceholder}
            className="min-w-[8rem] flex-1 border border-hs-line bg-hs-ink px-2 py-2 text-sm text-hs-chalk"
          />
          {identity.showTag ? (
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder={identity.tagPlaceholder}
              className="w-28 border border-hs-line bg-hs-ink px-2 py-2 text-sm text-hs-chalk"
            />
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => lookup(true)}
            className="border border-hs-signal/60 px-3 py-2 text-[10px] uppercase tracking-widest text-hs-signal hover:bg-hs-signal/10"
          >
            {pending ? "…" : "Look up"}
          </button>
        </div>
      )}

      {error ? <p className="mt-2 text-xs text-hs-danger">{error}</p> : null}

      {result ? (
        <div className="mt-3 space-y-2 border-t border-hs-line/60 pt-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {(() => {
                const key =
                  result.rankKeyHint ?? rankKeyFromLabel(result.rankLabel);
                if (!key || !result.rankLabel) return null;
                const apexDiv =
                  game === "apex" ? apexDivisionLabel(key) : null;
                return (
                  <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rankIconSrc(game, key)}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]"
                      draggable={false}
                    />
                    {apexDiv ? (
                      <span className="pointer-events-none absolute bottom-[14%] left-1/2 -translate-x-1/2 font-display text-[10px] font-bold leading-none text-hs-chalk [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
                        {apexDiv}
                      </span>
                    ) : null}
                  </span>
                );
              })()}
              <span className="font-display text-lg uppercase text-hs-chalk">
                {result.rankLabel ?? "Unranked"}
              </span>
            </div>
            {result.lpOrRr != null ? (
              <span className="text-hs-mute">
                {game === "valorant" ? "RR" : game === "apex" ? "RP" : "LP"}{" "}
                {result.lpOrRr}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-hs-mute">{result.displayName}</div>
          {result.peakLabel ? (
            <div className="text-xs text-hs-mute">Peak {result.peakLabel}</div>
          ) : null}
          {result.wins != null || result.losses != null ? (
            <div className="text-xs text-hs-mute">
              {result.wins ?? "—"}W / {result.losses ?? "—"}L
            </div>
          ) : null}
          {result.topUnits.length > 0 ? (
            <ul className="text-xs text-hs-mute">
              {result.topUnits.slice(0, 4).map((u) => (
                <li key={u.name}>
                  {u.name}
                  {u.games != null ? ` · ${u.games}g` : ""}
                  {u.winRate != null
                    ? ` · ${Math.round(u.winRate * (u.winRate <= 1 ? 100 : 1))}%`
                    : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {result.error ? (
            <p className="text-xs text-hs-mute">{result.error}</p>
          ) : null}
          {allowManualRank &&
          catalogRanks.length > 0 &&
          (!result.rankLabel || /^unranked$/i.test(result.rankLabel)) ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <select
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                className="min-w-[10rem] flex-1 border border-hs-line bg-hs-ink px-2 py-1.5 text-xs text-hs-chalk"
              >
                <option value="">Set rank manually…</option>
                {catalogRanks.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!manualKey}
                onClick={() => {
                  const rank = catalogRanks.find((r) => r.key === manualKey);
                  if (!rank) return;
                  const n =
                    (embedded ? defaultName : name).trim() || result.displayName;
                  const t = (embedded ? defaultTag : tag).trim();
                  const next: RankStatsView = {
                    ...result,
                    ok: true,
                    live: false,
                    displayName: n,
                    rankLabel: rank.label,
                    rankKeyHint: rank.key,
                    provider: "manual",
                    fetchedAt: new Date().toISOString(),
                    error: undefined,
                  };
                  setResult(next);
                  onResult?.(next);
                  onConfirmRank?.(rank.key, next);
                  // Persist against the linked game account when embedded.
                  if (embedded && n) {
                    void fetch("/api/rank/lookup", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        game,
                        name: n,
                        tag: t || undefined,
                        server: defaultServer,
                        save: true,
                        manualSnapshot: next,
                      }),
                    });
                  }
                }}
                className="border border-hs-signal/60 px-3 py-1.5 text-[10px] uppercase tracking-widest text-hs-signal hover:bg-hs-signal/10 disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          ) : null}
          {onConfirmRank && result.rankKeyHint ? (
            <button
              type="button"
              onClick={() => onConfirmRank(result.rankKeyHint!, result)}
              className="mt-2 border border-hs-ok/50 px-3 py-1.5 text-[10px] uppercase tracking-widest text-hs-ok hover:bg-hs-ok/10"
            >
              Use as current rank
            </button>
          ) : null}
          <div className="text-[10px] text-hs-mute/70">
            Updated {new Date(result.fetchedAt).toLocaleString()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
