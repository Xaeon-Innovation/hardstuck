"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GameSlugs,
  CATALOGS,
  MarketplaceCategories,
  type GameSlug,
  type MarketplaceCategory,
} from "@hardstuck/shared";
import { SiteShell } from "@/components/site-shell";

const CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  boosting: "Boosting",
  account: "Accounts",
  coins: "Game Coins",
  items: "Game Items",
  top_up: "Top Up",
  gift_card: "Gift Cards",
  coaching: "Coaching",
};

export default function MarketplaceSellPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<GameSlug>("lol");
  const [category, setCategory] = useState<MarketplaceCategory>("account");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [rankLabel, setRankLabel] = useState("");
  const [skinsSummary, setSkinsSummary] = useState("");
  const [server, setServer] = useState(CATALOGS.lol.servers[0]!.key);
  const [price, setPrice] = useState("49.00");
  const [deliveryHours, setDeliveryHours] = useState("24");
  const [stock, setStock] = useState("1");
  const [startRankKey, setStartRankKey] = useState("");
  const [endRankKey, setEndRankKey] = useState("");
  const [sessionMinutes, setSessionMinutes] = useState("60");
  const [denomination, setDenomination] = useState("");

  function onGame(g: GameSlug) {
    setGame(g);
    setServer(CATALOGS[g].servers[0]!.key);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const priceUsdCents = Math.round(Number(price) * 100);
    if (!Number.isFinite(priceUsdCents) || priceUsdCents < 500) {
      setError("Minimum listing price is $5");
      return;
    }

    const attributes: Record<string, unknown> = {};
    if (category === "boosting") {
      attributes.startRankKey = startRankKey || rankLabel;
      attributes.endRankKey = endRankKey || rankLabel;
      attributes.serviceType = "solo";
    }
    if (category === "coaching") {
      attributes.sessionMinutes = Number(sessionMinutes) || 60;
    }
    if (
      category === "coins" ||
      category === "top_up" ||
      category === "gift_card"
    ) {
      attributes.denomination = denomination;
    }

    startTransition(async () => {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          game,
          category,
          title,
          summary,
          rankLabel: rankLabel || undefined,
          skinsSummary: skinsSummary || undefined,
          server,
          priceUsdCents,
          attributes,
          deliveryHours: Number(deliveryHours) || undefined,
          stock:
            category === "account"
              ? 1
              : Number.isFinite(Number(stock))
                ? Number(stock)
                : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create offer");
        if (res.status === 401) router.push("/login");
        return;
      }
      router.push("/marketplace/mine");
    });
  }

  return (
    <SiteShell>
      <p className="hs-page-kicker">Sell</p>
      <h1 className="hs-page-title">Create marketplace offer</h1>
      <p className="hs-page-lead">
        Draft offers await admin approval. You keep 80% after the buyer
        confirms. Boosting offers require an approved booster profile for that
        game.
      </p>

      <form onSubmit={submit} className="mt-8 max-w-lg space-y-4">
        <label className="block text-xs uppercase tracking-wider text-hs-mute">
          Category
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as MarketplaceCategory)
            }
            className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          >
            {MarketplaceCategories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs uppercase tracking-wider text-hs-mute">
          Game
          <select
            value={game}
            onChange={(e) => onGame(e.target.value as GameSlug)}
            className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          >
            {GameSlugs.map((g) => (
              <option key={g} value={g}>
                {CATALOGS[g].name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs uppercase tracking-wider text-hs-mute">
          Title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          />
        </label>
        <label className="block text-xs uppercase tracking-wider text-hs-mute">
          Summary
          <textarea
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          />
        </label>
        {category === "boosting" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs uppercase tracking-wider text-hs-mute">
              From rank
              <input
                value={startRankKey}
                onChange={(e) => setStartRankKey(e.target.value)}
                className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
              />
            </label>
            <label className="block text-xs uppercase tracking-wider text-hs-mute">
              To rank
              <input
                value={endRankKey}
                onChange={(e) => setEndRankKey(e.target.value)}
                className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
              />
            </label>
          </div>
        ) : null}
        {category === "account" || category === "boosting" ? (
          <label className="block text-xs uppercase tracking-wider text-hs-mute">
            Rank label
            <input
              value={rankLabel}
              onChange={(e) => setRankLabel(e.target.value)}
              className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
            />
          </label>
        ) : null}
        {category === "account" ? (
          <label className="block text-xs uppercase tracking-wider text-hs-mute">
            Skins / extras
            <input
              value={skinsSummary}
              onChange={(e) => setSkinsSummary(e.target.value)}
              className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
            />
          </label>
        ) : null}
        {category === "coaching" ? (
          <label className="block text-xs uppercase tracking-wider text-hs-mute">
            Session minutes
            <input
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(e.target.value)}
              className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
            />
          </label>
        ) : null}
        {category === "coins" ||
        category === "top_up" ||
        category === "gift_card" ? (
          <label className="block text-xs uppercase tracking-wider text-hs-mute">
            Denomination
            <input
              value={denomination}
              onChange={(e) => setDenomination(e.target.value)}
              className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
              placeholder="e.g. 1000 RP"
            />
          </label>
        ) : null}
        <label className="block text-xs uppercase tracking-wider text-hs-mute">
          Server / platform
          <select
            value={server}
            onChange={(e) => setServer(e.target.value)}
            className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          >
            {CATALOGS[game].servers.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs uppercase tracking-wider text-hs-mute">
            Price (USD)
            <input
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
            />
          </label>
          <label className="block text-xs uppercase tracking-wider text-hs-mute">
            Delivery (hours)
            <input
              value={deliveryHours}
              onChange={(e) => setDeliveryHours(e.target.value)}
              className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
            />
          </label>
        </div>
        {category !== "account" ? (
          <label className="block text-xs uppercase tracking-wider text-hs-mute">
            Stock
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
            />
          </label>
        ) : null}
        {error ? <p className="text-sm text-hs-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="hs-btn-primary w-full"
        >
          {pending ? "Saving…" : "Submit draft offer"}
        </button>
      </form>
    </SiteShell>
  );
}
