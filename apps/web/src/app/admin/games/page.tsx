"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type Row = {
  game: string;
  status: "open" | "offline";
  availableBoosters: number;
  forceOffline: boolean;
  reason?: string;
};

export default function AdminGamesPage() {
  const [games, setGames] = useState<Row[]>([]);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/games")
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) setGames(data.games ?? []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setForce(game: string, forceOffline: boolean) {
    start(async () => {
      setError(null);
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game,
          forceOffline,
          note: forceOffline ? "Maintenance" : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      setGames(data.games ?? []);
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
        <h1 className="font-display text-3xl uppercase text-hs-chalk">
          Game coverage
        </h1>
        <p className="mt-2 text-sm text-hs-mute">
          Matched-pool games stay offline when no approved booster is online
          with capacity. Force-off locks a game for maintenance.
        </p>
        {error ? (
          <p className="mt-4 text-sm text-hs-danger">{error}</p>
        ) : null}
        <div className="mt-8 space-y-3">
          {games.map((g) => (
            <div
              key={g.game}
              className="hs-panel flex flex-wrap items-center justify-between gap-4 p-4"
            >
              <div>
                <div className="font-display text-lg uppercase text-hs-chalk">
                  {g.game}
                </div>
                <div className="text-xs text-hs-mute">
                  {g.status === "open" ? (
                    <span className="text-hs-ok">
                      Open · {g.availableBoosters} booster
                      {g.availableBoosters === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="text-hs-danger">
                      Offline · {g.reason ?? "no coverage"}
                      {g.forceOffline ? " (forced)" : ""}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => setForce(g.game, !g.forceOffline)}
                className="border border-hs-line px-3 py-2 text-[10px] uppercase tracking-widest text-hs-mute hover:text-hs-chalk"
              >
                {g.forceOffline ? "Clear force-off" : "Force offline"}
              </button>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
