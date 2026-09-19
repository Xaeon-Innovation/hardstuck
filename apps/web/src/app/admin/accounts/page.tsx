"use client";

import { useEffect, useState, useTransition } from "react";
import { SiteShell } from "@/components/site-shell";

type Listing = {
  id: string;
  title: string;
  game: string;
  status: string;
  priceUsdCents: number;
  sellerUserId: string;
};

type Sale = {
  id: string;
  status: string;
  amountUsdCents: number;
  sellerShareUsdCents: number;
};

type Seller = {
  userId: string;
  status: string;
  idStatus: string;
};

export default function AdminAccountsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    fetch("/api/admin/accounts")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        setListings(d.listings ?? []);
        setSales(d.sales ?? []);
        setSellers(d.sellers ?? []);
      })
      .catch(() => setError("Failed to load"));
  }

  useEffect(() => {
    load();
  }, []);

  function act(body: Record<string, string>) {
    startTransition(async () => {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed");
      load();
    });
  }

  return (
    <SiteShell wide>
      <p className="hs-page-kicker">Ops</p>
      <h1 className="hs-page-title">Account marketplace</h1>
      {error ? <p className="mt-2 text-sm text-hs-danger">{error}</p> : null}

      <section className="mt-10">
        <h2 className="font-display text-lg uppercase text-hs-signal">
          Listings
        </h2>
        <ul className="mt-4 space-y-2">
          {listings.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-hs-line px-4 py-3 text-sm"
            >
              <span>
                <span className="text-hs-chalk">{l.title}</span>{" "}
                <span className="text-hs-mute">
                  · {l.game} · {l.status} · $
                  {(l.priceUsdCents / 100).toFixed(2)}
                </span>
              </span>
              <span className="flex gap-2">
                {l.status !== "listed" ? (
                  <button
                    type="button"
                    disabled={pending}
                    className="hs-btn-ghost"
                    onClick={() =>
                      act({
                        action: "list",
                        listingId: l.id,
                        status: "listed",
                      })
                    }
                  >
                    List
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    className="hs-btn-ghost"
                    onClick={() =>
                      act({
                        action: "list",
                        listingId: l.id,
                        status: "removed",
                      })
                    }
                  >
                    Remove
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg uppercase text-hs-signal">Sales</h2>
        <ul className="mt-4 space-y-2">
          {sales.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-hs-line px-4 py-3 text-sm"
            >
              <span>
                {s.id.slice(0, 8)} · {s.status} · $
                {(s.amountUsdCents / 100).toFixed(2)} (seller $
                {(s.sellerShareUsdCents / 100).toFixed(2)})
              </span>
              {s.status === "completed" ? (
                <button
                  type="button"
                  disabled={pending}
                  className="hs-btn-ghost"
                  onClick={() =>
                    act({ action: "release_sale", saleId: s.id })
                  }
                >
                  Release payout
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg uppercase text-hs-signal">
          Sellers
        </h2>
        <ul className="mt-4 space-y-2">
          {sellers.map((s) => (
            <li
              key={s.userId}
              className="flex flex-wrap items-center justify-between gap-3 border border-hs-line px-4 py-3 text-sm"
            >
              <span>
                {s.userId.slice(0, 10)}… · {s.status} · id {s.idStatus}
              </span>
              {s.status !== "approved" ? (
                <button
                  type="button"
                  disabled={pending}
                  className="hs-btn-ghost"
                  onClick={() =>
                    act({ action: "approve_seller", userId: s.userId })
                  }
                >
                  Approve
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </SiteShell>
  );
}
