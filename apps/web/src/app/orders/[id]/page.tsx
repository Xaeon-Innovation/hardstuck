"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { CredentialVault } from "@/components/credential-vault";
import { OrderChat } from "@/components/order-chat";
import { rankIconSrc } from "@/lib/assets";
import { IconArrow } from "@/components/icons";
import { authClient } from "@/lib/auth-client";

type Order = {
  id: string;
  status: string;
  game: string;
  serviceType: string;
  startRankKey: string;
  endRankKey: string;
  server: string;
  queue: string;
  amountUsdCents: number;
  amountEurCents: number;
  divisions: number;
  releaseAt?: string | null;
  provider?: string | null;
  clientUserId?: string;
  boosterUserId?: string | null;
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentProvider, setPaymentProvider] = useState("manual");
  const [allowSimulatePay, setAllowSimulatePay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    fetch(`/api/orders/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Failed to load");
          if (r.status === 401) router.push("/login");
          return;
        }
        setOrder(data.order);
        if (data.paymentProvider) setPaymentProvider(data.paymentProvider);
        if (typeof data.allowSimulatePay === "boolean") {
          setAllowSimulatePay(data.allowSimulatePay);
        }
      })
      .catch(() => setError("Failed to load"));
  }

  useEffect(() => {
    load();
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("paid") === "1"
    ) {
      const t = setTimeout(load, 1600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function act(action: string) {
    startTransition(async () => {
      const res = await fetch(`/api/orders/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Action failed");
        return;
      }
      if (action === "checkout" && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      load();
    });
  }

  function boosterAct(action: "start" | "deliver") {
    startTransition(async () => {
      const res = await fetch("/api/booster/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, orderId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      load();
    });
  }

  const isBoosterOnOrder =
    Boolean(session?.user?.id) && order?.boosterUserId === session?.user?.id;
  const chatOpen =
    order &&
    !["draft", "awaiting_payment", "cancelled", "refunded"].includes(
      order.status,
    );

  return (
    <SiteShell>
      <Link
        href={role === "booster" ? "/booster" : "/dashboard"}
        className="text-xs uppercase tracking-wider text-hs-mute hover:text-hs-chalk"
      >
        ← {role === "booster" ? "Booster desk" : "Orders"}
      </Link>
      <p className="hs-page-kicker mt-4">Order</p>
      <h1 className="hs-page-title">Ticket</h1>
      {error ? <p className="mt-4 text-hs-danger">{error}</p> : null}
      {!order && !error ? (
        <p className="mt-6 text-hs-mute">Loading…</p>
      ) : null}
      {order ? (
        <>
          <div className="hs-panel hs-ticket mt-6 space-y-5 p-6">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-hs-mute">
                  <span className="hs-live-dot" />
                  {order.status.replaceAll("_", " ")}
                </span>
                <span className="font-display text-2xl text-hs-signal">
                  ${(order.amountUsdCents / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-center gap-4 border border-hs-line bg-hs-ink/50 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rankIconSrc(
                    order.game as "lol" | "valorant",
                    order.startRankKey,
                  )}
                  alt=""
                  width={48}
                  height={48}
                />
                <IconArrow className="h-5 w-5 text-hs-signal" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rankIconSrc(
                    order.game as "lol" | "valorant",
                    order.endRankKey,
                  )}
                  alt=""
                  width={48}
                  height={48}
                />
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm text-hs-mute">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider">Game</dt>
                  <dd className="text-hs-chalk">{order.game}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider">
                    Service
                  </dt>
                  <dd className="text-hs-chalk">{order.serviceType}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider">
                    Server
                  </dt>
                  <dd className="text-hs-chalk">{order.server}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider">
                    Provider
                  </dt>
                  <dd className="text-hs-chalk">
                    {order.provider ?? paymentProvider}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-col gap-2">
                {order.status === "awaiting_payment" ? (
                  <>
                    {paymentProvider === "polar" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => act("checkout")}
                        className="bg-hs-signal py-3 font-display text-sm uppercase tracking-widest text-hs-ink disabled:opacity-50"
                      >
                        {pending ? "Redirecting…" : "Pay with Polar"}
                      </button>
                    ) : null}
                    {allowSimulatePay ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => act("pay")}
                        className={`${
                          paymentProvider === "polar"
                            ? "border border-hs-line py-3 text-xs uppercase tracking-widest text-hs-mute"
                            : "bg-hs-signal py-3 font-display text-sm uppercase tracking-widest text-hs-ink"
                        } disabled:opacity-50`}
                      >
                        {pending
                          ? "Processing…"
                          : paymentProvider === "polar"
                            ? "Simulate pay (dev)"
                            : "Pay now (soft-launch)"}
                      </button>
                    ) : null}
                  </>
                ) : null}
                {order.status === "delivered" &&
                order.clientUserId === session?.user?.id ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => act("confirm")}
                    className="bg-hs-signal py-3 font-display text-sm uppercase tracking-widest text-hs-ink"
                  >
                    Confirm completion
                  </button>
                ) : null}
                {isBoosterOnOrder && order.status === "assigned" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => boosterAct("start")}
                    className="bg-hs-signal py-3 font-display text-sm uppercase tracking-widest text-hs-ink"
                  >
                    Start boost
                  </button>
                ) : null}
                {isBoosterOnOrder && order.status === "in_progress" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => boosterAct("deliver")}
                    className="bg-hs-signal py-3 font-display text-sm uppercase tracking-widest text-hs-ink"
                  >
                    Mark delivered
                  </button>
                ) : null}
                {["paid", "offered", "assigned", "in_progress"].includes(
                  order.status,
                ) ? (
                  <p className="text-xs text-hs-mute">
                    Matched-pool assignment in progress.
                  </p>
                ) : null}
                {order.status === "completed" && order.releaseAt ? (
                  <p className="text-xs text-hs-mute">
                    Release hold until{" "}
                    {new Date(order.releaseAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            </div>

            {order.serviceType === "solo" ? (
              <CredentialVault orderId={order.id} />
            ) : null}

            {chatOpen ? (
              <OrderChat
                orderId={order.id}
                currentUserId={session?.user?.id}
              />
            ) : null}
          </>
        ) : null}
    </SiteShell>
  );
}
