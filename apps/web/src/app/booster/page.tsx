"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { rankIconSrc } from "@/lib/assets";

type OfferRow = {
  offer: { id: string; expiresAt: string };
  order: {
    id: string;
    game: string;
    serviceType: string;
    startRankKey: string;
    endRankKey: string;
    amountUsdCents: number;
    server: string;
  };
};

type OrderRow = {
  id: string;
  status: string;
  game: string;
  serviceType: string;
  startRankKey: string;
  endRankKey: string;
  amountUsdCents: number;
};

type AvailableOrder = {
  id: string;
  game: string;
  amountUsdCents: number;
  serviceType: string;
};

export default function BoosterDashboardPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [earnings, setEarnings] = useState({
    payableCents: 0,
    releasedCents: 0,
    paidOutCents: 0,
  });
  const [available, setAvailable] = useState<AvailableOrder[]>([]);
  const [idStatus, setIdStatus] = useState("none");
  const [disputeFreeze, setDisputeFreeze] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payoutMsg, setPayoutMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    fetch("/api/booster/dashboard")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Failed");
          if (r.status === 401) router.push("/login");
          return;
        }
        setOffers(data.offers ?? []);
        setOrders(data.orders ?? []);
        if (data.earnings) setEarnings(data.earnings);
      })
      .catch(() => setError("Failed to load dashboard"));

    fetch("/api/booster/payouts")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) return;
        setAvailable(data.available ?? []);
        setIdStatus(data.idStatus ?? "none");
        setDisputeFreeze(Boolean(data.disputeFreeze));
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
  }, []);

  function accept(offerId: string) {
    startTransition(async () => {
      const res = await fetch("/api/booster/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", offerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Accept failed");
        return;
      }
      router.push(`/orders/${data.orderId}`);
    });
  }

  function requestPayout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      setPayoutMsg(null);
      setError(null);
      const res = await fetch("/api/booster/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          orderId: String(fd.get("orderId")),
          method: String(fd.get("method")),
          destination: String(fd.get("destination")),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Payout request failed");
        return;
      }
      setPayoutMsg("Payout requested — admin will send Payoneer/Wise.");
      form.reset();
      load();
    });
  }

  return (
    <SiteShell>
      <p className="hs-page-kicker">Booster</p>
      <h1 className="hs-page-title">Desk</h1>
      <p className="hs-page-lead">
        Open offers, active orders, and escrow earnings.
      </p>

        {error ? <p className="mt-4 text-hs-danger">{error}</p> : null}
        {payoutMsg ? <p className="mt-4 text-hs-ok">{payoutMsg}</p> : null}
        {disputeFreeze ? (
          <p className="mt-4 text-sm text-hs-danger">
            Payouts frozen — you have an open dispute.
          </p>
        ) : null}

        <section className="mt-8 grid grid-cols-3 gap-3">
          {(
            [
              ["Payable", earnings.payableCents],
              ["Released", earnings.releasedCents],
              ["Paid out", earnings.paidOutCents],
            ] as const
          ).map(([label, cents]) => (
            <div key={label} className="hs-panel p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-hs-mute">
                {label}
              </div>
              <div className="mt-1 font-display text-xl text-hs-signal">
                ${(cents / 100).toFixed(2)}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-sm uppercase tracking-widest text-hs-signal">
            Request payout
          </h2>
          <p className="mt-2 text-sm text-hs-mute">
            ID status: <span className="text-hs-chalk">{idStatus}</span>
            {idStatus !== "approved" ? (
              <>
                {" "}
                — upload ID on{" "}
                <Link href="/account" className="text-hs-signal underline">
                  profile
                </Link>
              </>
            ) : null}
          </p>
          {available.length === 0 ? (
            <p className="hs-panel mt-3 p-4 text-sm text-hs-mute">
              No released orders ready to cash out.
            </p>
          ) : (
            <form
              onSubmit={requestPayout}
              className="hs-panel mt-3 grid gap-2 p-4 sm:grid-cols-2"
            >
              <select
                name="orderId"
                required
                className="hs-input sm:col-span-2"
              >
                {available.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.game} · {o.serviceType} · $
                    {(o.amountUsdCents / 100).toFixed(2)}
                  </option>
                ))}
              </select>
              <select
                name="method"
                required
                className="hs-input"
                defaultValue="payoneer"
              >
                <option value="payoneer">Payoneer</option>
                <option value="wise">Wise</option>
              </select>
              <input
                name="destination"
                required
                placeholder="Email / account ID"
                className="hs-input"
              />
              <button
                type="submit"
                disabled={pending || idStatus !== "approved" || disputeFreeze}
                className="hs-btn-primary sm:col-span-2"
              >
                Request payout
              </button>
            </form>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-sm uppercase tracking-widest text-hs-signal">
            Open offers
          </h2>
          <div className="mt-3 space-y-3">
            {offers.length === 0 ? (
              <p className="hs-panel p-6 text-hs-mute">No open offers right now.</p>
            ) : (
              offers.map(({ offer, order }) => (
                <div
                  key={offer.id}
                  className="hs-panel flex flex-wrap items-center justify-between gap-4 p-4"
                >
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rankIconSrc(
                        order.game as "lol" | "valorant",
                        order.startRankKey,
                      )}
                      alt=""
                      width={36}
                      height={36}
                    />
                    <span className="text-hs-mute">→</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rankIconSrc(
                        order.game as "lol" | "valorant",
                        order.endRankKey,
                      )}
                      alt=""
                      width={36}
                      height={36}
                    />
                    <div className="ml-1 text-sm text-hs-chalk">
                      {order.game} · {order.serviceType} · {order.server}
                      <div className="text-[10px] uppercase text-hs-mute">
                        Expires {new Date(offer.expiresAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-hs-signal">
                      ${(order.amountUsdCents / 100).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => accept(offer.id)}
                      className="hs-btn-primary px-3 py-2 text-xs"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-sm uppercase tracking-widest text-hs-signal">
            Your orders
          </h2>
          <div className="mt-3 space-y-3">
            {orders.length === 0 ? (
              <p className="hs-panel p-6 text-hs-mute">No assigned orders yet.</p>
            ) : (
              orders.map((o) => (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="hs-panel flex flex-wrap items-center justify-between gap-4 p-4 hover:border-hs-signal/40"
                >
                  <div className="flex items-center gap-3 text-sm text-hs-chalk">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rankIconSrc(
                        o.game as "lol" | "valorant",
                        o.startRankKey,
                      )}
                      alt=""
                      width={32}
                      height={32}
                    />
                    <span>
                      {o.game} · {o.serviceType}
                      <span className="ml-2 text-[10px] uppercase text-hs-mute">
                        {o.status.replaceAll("_", " ")}
                      </span>
                    </span>
                  </div>
                  <span className="font-display text-hs-signal">
                    ${(o.amountUsdCents / 100).toFixed(2)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
    </SiteShell>
  );
}
