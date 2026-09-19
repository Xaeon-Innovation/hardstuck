"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GameSlugs, CATALOGS, type GameSlug } from "@hardstuck/shared";
import { SiteShell } from "@/components/site-shell";

export default function SellAccountPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<GameSlug>("lol");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [rankLabel, setRankLabel] = useState("");
  const [skinsSummary, setSkinsSummary] = useState("");
  const [server, setServer] = useState(CATALOGS.lol.servers[0]!.key);
  const [price, setPrice] = useState("49.00");

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
    startTransition(async () => {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          game,
          title,
          summary,
          rankLabel: rankLabel || undefined,
          skinsSummary: skinsSummary || undefined,
          server,
          priceUsdCents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create listing");
        if (res.status === 401) router.push("/login");
        return;
      }
      router.push("/accounts");
    });
  }

  return (
    <SiteShell>
      <p className="hs-page-kicker">Sell</p>
      <h1 className="hs-page-title">List an account</h1>
      <p className="hs-page-lead">
        Draft listings await admin approval before they go live. You keep 80%
        after the buyer confirms transfer.
      </p>

      <form onSubmit={submit} className="mt-8 max-w-lg space-y-4">
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
            placeholder="Diamond EUW smurf"
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
        <label className="block text-xs uppercase tracking-wider text-hs-mute">
          Rank label
          <input
            value={rankLabel}
            onChange={(e) => setRankLabel(e.target.value)}
            className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          />
        </label>
        <label className="block text-xs uppercase tracking-wider text-hs-mute">
          Skins / extras
          <input
            value={skinsSummary}
            onChange={(e) => setSkinsSummary(e.target.value)}
            className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          />
        </label>
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
        <label className="block text-xs uppercase tracking-wider text-hs-mute">
          Price (USD)
          <input
            required
            type="number"
            step="0.01"
            min="5"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          />
        </label>
        {error ? <p className="text-sm text-hs-danger">{error}</p> : null}
        <button type="submit" disabled={pending} className="hs-btn-primary">
          {pending ? "Submitting…" : "Submit draft"}
        </button>
      </form>
    </SiteShell>
  );
}
