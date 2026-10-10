"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";

type Listing = {
  id: string;
  game: string;
  category: string;
  title: string;
  status: string;
  priceUsdCents: number;
};

export default function MyOffersPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function load() {
    fetch("/api/accounts?mine=1")
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.listings) setListings(d.listings);
      })
      .catch(() => setError("Could not load offers"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pause(listingId: string) {
    start(async () => {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause", listingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Pause failed");
        return;
      }
      load();
    });
  }

  return (
    <SiteShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hs-page-kicker">Seller</p>
          <h1 className="hs-page-title">My offers</h1>
        </div>
        <Link href="/marketplace/sell" className="hs-btn-ghost">
          New offer
        </Link>
      </div>
      {error ? <p className="mt-4 text-sm text-hs-danger">{error}</p> : null}
      <div className="mt-8 space-y-3">
        {listings.map((l) => (
          <div
            key={l.id}
            className="hs-panel flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <div className="font-display text-lg uppercase text-hs-chalk">
                {l.title}
              </div>
              <div className="text-xs text-hs-mute">
                {l.game} · {l.category} · {l.status} · $
                {(l.priceUsdCents / 100).toFixed(2)}
              </div>
            </div>
            {l.status === "listed" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => pause(l.id)}
                className="border border-hs-line px-3 py-2 text-[10px] uppercase tracking-widest text-hs-mute"
              >
                Pause
              </button>
            ) : null}
          </div>
        ))}
        {listings.length === 0 ? (
          <p className="text-sm text-hs-mute">No offers yet.</p>
        ) : null}
      </div>
    </SiteShell>
  );
}
