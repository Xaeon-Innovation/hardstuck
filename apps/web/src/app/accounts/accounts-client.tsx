"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GameSlugs, CATALOGS, type GameSlug } from "@hardstuck/shared";
import { SiteShell } from "@/components/site-shell";

type Listing = {
  id: string;
  game: string;
  title: string;
  summary: string;
  rankLabel: string | null;
  skinsSummary: string | null;
  server: string;
  priceUsdCents: number;
  featured: boolean;
};

export default function AccountsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGame = searchParams.get("game") ?? "";
  const [game, setGame] = useState(initialGame);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const q = game ? `?game=${encodeURIComponent(game)}` : "";
    fetch(`/api/accounts${q}`)
      .then((r) => r.json())
      .then((d) => setListings(d.listings ?? []))
      .catch(() => setError("Could not load listings"));
  }, [game]);

  function buy(listingId: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purchase", listingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Purchase failed");
        if (res.status === 401) router.push("/login");
        return;
      }
      router.push(`/accounts/sales/${data.saleId}`);
    });
  }

  return (
    <SiteShell wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hs-page-kicker">Marketplace</p>
          <h1 className="hs-page-title">Accounts</h1>
          <p className="hs-page-lead">
            Escrowed listings. Platform holds payment until you confirm transfer.
            Sellers keep 80%.
          </p>
        </div>
        <Link href="/accounts/sell" className="hs-btn-ghost">
          Sell an account
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setGame("")}
          className={`border px-3 py-1.5 text-xs uppercase tracking-wider ${
            !game
              ? "border-hs-signal text-hs-signal"
              : "border-hs-line text-hs-mute"
          }`}
        >
          All
        </button>
        {GameSlugs.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGame(g)}
            className={`border px-3 py-1.5 text-xs uppercase tracking-wider ${
              game === g
                ? "border-hs-signal text-hs-signal"
                : "border-hs-line text-hs-mute"
            }`}
          >
            {CATALOGS[g as GameSlug].shortName}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-hs-danger">{error}</p> : null}

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => (
          <li key={l.id} className="border border-hs-line bg-hs-panel/40 p-5">
            <p className="font-display text-xs uppercase tracking-[0.2em] text-hs-signal">
              {l.game}
              {l.featured ? " · Featured" : ""}
            </p>
            <h2 className="mt-2 font-display text-xl uppercase text-hs-chalk">
              {l.title}
            </h2>
            <p className="mt-2 text-sm text-hs-mute">{l.summary}</p>
            {l.rankLabel ? (
              <p className="mt-2 text-xs text-hs-mute">Rank: {l.rankLabel}</p>
            ) : null}
            {l.skinsSummary ? (
              <p className="mt-1 text-xs text-hs-mute">{l.skinsSummary}</p>
            ) : null}
            <p className="mt-1 text-xs uppercase tracking-wider text-hs-mute">
              {l.server}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="font-display text-2xl text-hs-chalk">
                ${(l.priceUsdCents / 100).toFixed(2)}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => buy(l.id)}
                className="hs-btn-primary"
              >
                Buy
              </button>
            </div>
          </li>
        ))}
      </ul>

      {listings.length === 0 ? (
        <p className="mt-10 text-sm text-hs-mute">
          No listed accounts yet. Seed demo inventory or{" "}
          <Link href="/accounts/sell" className="text-hs-signal">
            list one
          </Link>
          .
        </p>
      ) : null}
    </SiteShell>
  );
}
