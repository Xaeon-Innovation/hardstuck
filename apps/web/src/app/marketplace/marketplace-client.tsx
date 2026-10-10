"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CATALOGS,
  GameSlugs,
  MarketplaceCategories,
  type GameSlug,
  type MarketplaceCategory,
} from "@hardstuck/shared";
import { SiteShell } from "@/components/site-shell";
import { gameLogoSrc } from "@/lib/assets";

type Listing = {
  id: string;
  game: string;
  category: string;
  title: string;
  summary: string;
  rankLabel: string | null;
  skinsSummary: string | null;
  server: string;
  priceUsdCents: number;
  featured: boolean;
  deliveryHours: number | null;
  stock: number | null;
  attributes: Record<string, unknown>;
  sellerRating: { avg: number; count: number };
};

const CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  boosting: "Boosting",
  account: "Accounts",
  coins: "Game Coins",
  items: "Game Items",
  top_up: "Top Up",
  gift_card: "Gift Cards",
  coaching: "Coaching",
};

export default function MarketplaceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [game, setGame] = useState(searchParams.get("game") ?? "");
  const [category, setCategory] = useState(
    searchParams.get("category") ?? "",
  );
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [server, setServer] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (game) p.set("game", game);
    if (category) p.set("category", category);
    if (q.trim()) p.set("q", q.trim());
    if (server) p.set("server", server);
    if (minPrice) p.set("minPrice", String(Math.round(Number(minPrice) * 100)));
    if (maxPrice) p.set("maxPrice", String(Math.round(Number(maxPrice) * 100)));
    if (featuredOnly) p.set("featured", "1");
    if (inStock) p.set("inStock", "1");
    if (sort) p.set("sort", sort);
    return p.toString();
  }, [game, category, q, server, minPrice, maxPrice, featuredOnly, inStock, sort]);

  useEffect(() => {
    fetch(`/api/accounts?${queryString}`)
      .then((r) => r.json())
      .then((d) => setListings(d.listings ?? []))
      .catch(() => setError("Could not load offers"));
  }, [queryString]);

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
          <h1 className="hs-page-title">Browse offers</h1>
          <p className="hs-page-lead">
            Seller-priced boosting, accounts, coins, items, and more. HardStuck
            matched-pool stays on the{" "}
            <Link href="/boost" className="text-hs-signal hover:underline">
              calculator
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/marketplace/sell" className="hs-btn-ghost">
            Sell an offer
          </Link>
          <Link href="/marketplace/mine" className="hs-btn-ghost">
            My offers
          </Link>
        </div>
      </div>

      {/* Games */}
      <div className="mt-8 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <button
          type="button"
          onClick={() => setGame("")}
          className={`flex items-center justify-between gap-2 border px-3 py-3 text-left text-xs uppercase tracking-wider ${
            !game
              ? "border-hs-signal text-hs-signal"
              : "border-hs-line text-hs-mute"
          }`}
        >
          <span>All games</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gameLogoSrc("all")}
            alt=""
            className="h-5 w-5 shrink-0 opacity-90"
          />
        </button>
        {GameSlugs.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGame(g)}
            className={`flex items-center justify-between gap-2 border px-3 py-3 text-left text-xs uppercase tracking-wider ${
              game === g
                ? "border-hs-signal text-hs-signal"
                : "border-hs-line text-hs-mute"
            }`}
          >
            <span>{CATALOGS[g as GameSlug].shortName}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gameLogoSrc(g as GameSlug)}
              alt=""
              className="h-5 w-5 shrink-0 object-contain"
            />
          </button>
        ))}
      </div>

      {/* Categories */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("")}
          className={`border px-3 py-1.5 text-[10px] uppercase tracking-widest ${
            !category
              ? "border-hs-signal text-hs-signal"
              : "border-hs-line text-hs-mute"
          }`}
        >
          All
        </button>
        {MarketplaceCategories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`border px-3 py-1.5 text-[10px] uppercase tracking-widest ${
              category === c
                ? "border-hs-signal text-hs-signal"
                : "border-hs-line text-hs-mute"
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {category === "boosting" || !category ? (
        <div className="mt-4 hs-panel border-hs-signal/30 p-4 text-sm text-hs-mute">
          Want platform-priced matched-pool?{" "}
          <Link
            href={game ? `/boost?game=${game}` : "/boost"}
            className="text-hs-signal hover:underline"
          >
            Open HardStuck Boost calculator
          </Link>
          .
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="hs-panel space-y-3 p-4">
          <div className="text-[10px] uppercase tracking-widest text-hs-mute">
            Filters
          </div>
          <label className="block text-xs text-hs-mute">
            Search
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="mt-1 w-full border border-hs-line bg-hs-ink px-2 py-2 text-sm text-hs-chalk"
              placeholder="Title…"
            />
          </label>
          <label className="block text-xs text-hs-mute">
            Server
            <input
              value={server}
              onChange={(e) => setServer(e.target.value)}
              className="mt-1 w-full border border-hs-line bg-hs-ink px-2 py-2 text-sm text-hs-chalk"
              placeholder="euw, na…"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-hs-mute">
              Min $
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="mt-1 w-full border border-hs-line bg-hs-ink px-2 py-2 text-sm text-hs-chalk"
              />
            </label>
            <label className="block text-xs text-hs-mute">
              Max $
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="mt-1 w-full border border-hs-line bg-hs-ink px-2 py-2 text-sm text-hs-chalk"
              />
            </label>
          </div>
          <label className="block text-xs text-hs-mute">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-1 w-full border border-hs-line bg-hs-ink px-2 py-2 text-sm text-hs-chalk"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
              <option value="delivery">Fastest delivery</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-hs-mute">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
            />
            Featured only
          </label>
          <label className="flex items-center gap-2 text-xs text-hs-mute">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
            />
            In stock
          </label>
        </aside>

        <div>
          {error ? <p className="mb-4 text-sm text-hs-danger">{error}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {listings.map((l) => (
              <article key={l.id} className="hs-panel flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-hs-mute">
                      {l.game} ·{" "}
                      {CATEGORY_LABELS[l.category as MarketplaceCategory] ??
                        l.category}
                      {l.featured ? " · Featured" : ""}
                    </div>
                    <h2 className="mt-1 font-display text-lg uppercase text-hs-chalk">
                      {l.title}
                    </h2>
                  </div>
                  <div className="text-right font-display text-xl text-hs-signal">
                    ${(l.priceUsdCents / 100).toFixed(2)}
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-hs-mute">
                  {l.summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-hs-mute">
                  {l.rankLabel ? <span>{l.rankLabel}</span> : null}
                  <span>{l.server}</span>
                  {l.deliveryHours != null ? (
                    <span>≤ {l.deliveryHours}h</span>
                  ) : null}
                  {l.stock != null ? <span>Stock {l.stock}</span> : null}
                  {l.sellerRating.count > 0 ? (
                    <span>
                      ★ {l.sellerRating.avg.toFixed(1)} ({l.sellerRating.count})
                    </span>
                  ) : (
                    <span>New seller</span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => buy(l.id)}
                  className="hs-btn-primary mt-4 w-full"
                >
                  Buy
                </button>
              </article>
            ))}
          </div>
          {listings.length === 0 ? (
            <p className="mt-8 text-sm text-hs-mute">No offers match filters.</p>
          ) : null}
        </div>
      </div>
    </SiteShell>
  );
}
