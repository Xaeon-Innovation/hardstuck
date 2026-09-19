"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";

type Sale = {
  id: string;
  status: string;
  amountUsdCents: number;
  sellerShareUsdCents: number;
  buyerUserId: string;
  sellerUserId: string;
  listingId: string;
};

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creds, setCreds] = useState<{
    username: string;
    password: string;
    note?: string;
  } | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [userId, setUserId] = useState<string | null>(null);

  function load() {
    fetch(`/api/accounts/sales/${id}`)
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.sale) setSale(d.sale);
        if (d?.error) setError(d.error);
      })
      .catch(() => setError("Failed to load sale"));
  }

  useEffect(() => {
    load();
    fetch("/api/auth/get-session")
      .then((r) => r.json())
      .then((d) => setUserId(d?.user?.id ?? null))
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function act(action: string, extra: Record<string, string> = {}) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/accounts/sales/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return;
      }
      if (data.credentials) setCreds(data.credentials);
      load();
    });
  }

  if (!sale) {
    return (
      <SiteShell>
        <p className="text-hs-mute">{error ?? "Loading sale…"}</p>
      </SiteShell>
    );
  }

  const isBuyer = userId === sale.buyerUserId;
  const isSeller = userId === sale.sellerUserId;

  return (
    <SiteShell>
      <p className="hs-page-kicker">Account sale</p>
      <h1 className="hs-page-title">Escrow #{sale.id.slice(0, 8)}</h1>
      <p className="mt-2 text-sm text-hs-mute">
        Status: <span className="text-hs-signal">{sale.status}</span>
      </p>
      <p className="mt-4 font-display text-3xl text-hs-chalk">
        ${(sale.amountUsdCents / 100).toFixed(2)}
      </p>
      <p className="text-xs text-hs-mute">
        Seller share ${(sale.sellerShareUsdCents / 100).toFixed(2)} (80%)
      </p>

      {error ? <p className="mt-4 text-sm text-hs-danger">{error}</p> : null}

      <div className="mt-8 flex flex-wrap gap-3">
        {isBuyer && sale.status === "awaiting_payment" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => act("pay")}
            className="hs-btn-primary"
          >
            Pay (escrow)
          </button>
        ) : null}
        {isBuyer && sale.status === "delivered" ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => act("reveal")}
              className="hs-btn-ghost"
            >
              Reveal credentials
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => act("confirm")}
              className="hs-btn-primary"
            >
              Confirm transfer
            </button>
          </>
        ) : null}
      </div>

      {isSeller && (sale.status === "held" || sale.status === "delivered") ? (
        <form
          className="mt-8 max-w-md space-y-3 border border-hs-line p-4"
          onSubmit={(e) => {
            e.preventDefault();
            act("deposit", { username, password });
          }}
        >
          <p className="font-display text-sm uppercase text-hs-signal">
            Deposit credentials
          </p>
          <input
            required
            placeholder="Username / email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm"
          />
          <button type="submit" disabled={pending} className="hs-btn-primary">
            Deposit to vault
          </button>
        </form>
      ) : null}

      {creds ? (
        <div className="mt-6 border border-hs-signal/40 bg-hs-panel p-4 text-sm">
          <p className="font-display uppercase text-hs-signal">Credentials</p>
          <p className="mt-2 text-hs-chalk">User: {creds.username}</p>
          <p className="text-hs-chalk">Pass: {creds.password}</p>
          {creds.note ? <p className="text-hs-mute">{creds.note}</p> : null}
        </div>
      ) : null}
    </SiteShell>
  );
}
