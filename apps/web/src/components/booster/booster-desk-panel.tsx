"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { GameSlug } from "@hardstuck/shared";
import { gameLabel, rankIconSrc } from "@/lib/assets";
import type { NotificationItem } from "@/lib/notification-types";
import { OrderDetailWorkspace } from "@/components/notifications/order-detail-workspace";
import { OfferOrderPreview } from "@/components/booster/offer-order-preview";
import { OrderNotificationCard } from "@/components/notifications/order-notification-card";
import { BoosterOnlineControl } from "@/components/booster/booster-online-control";

type DeskTab = "queue" | "active" | "history" | "wallet";

type Earnings = {
  payableCents: number;
  releasedCents: number;
  paidOutCents: number;
};

type PayoutOrder = {
  id: string;
  game: string;
  serviceType: string;
  amountUsdCents: number;
};

type PayoutRow = {
  id: string;
  status: string;
  method: string;
  amountUsdCents: number;
  createdAt: string;
};

function isActiveStatus(status: string) {
  return status === "assigned" || status === "in_progress";
}

function isHistoryStatus(status: string) {
  return ["delivered", "completed", "cancelled", "refunded"].includes(status);
}

function expiresLabel(iso?: string): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.ceil(ms / 60_000);
  return min === 1 ? "1 min" : `${min} min`;
}

type Props = {
  items: NotificationItem[];
  activeOrderId: string | null;
  selectedOfferId: string | null;
  onSelectOffer: (offerId: string | null) => void;
  onSelectOrder: (orderId: string) => void;
  onAccept: (offerId: string) => void;
  accepting: boolean;
  onRefresh: () => void;
  liveConnected?: boolean;
  focusChat?: boolean;
  assignedGames?: string[];
};

export function BoosterDeskPanel({
  items,
  activeOrderId,
  selectedOfferId,
  onSelectOffer,
  onSelectOrder,
  onAccept,
  accepting,
  onRefresh,
  liveConnected,
  focusChat,
  assignedGames,
}: Props) {
  const [tab, setTab] = useState<DeskTab>("queue");
  const [earnings, setEarnings] = useState<Earnings>({
    payableCents: 0,
    releasedCents: 0,
    paidOutCents: 0,
  });
  const [queueOnline, setQueueOnline] = useState(true);
  const [availablePayouts, setAvailablePayouts] = useState<PayoutOrder[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRow[]>([]);
  const [idStatus, setIdStatus] = useState("none");
  const [disputeFreeze, setDisputeFreeze] = useState(false);
  const [deskError, setDeskError] = useState<string | null>(null);
  const [payoutMsg, setPayoutMsg] = useState<string | null>(null);
  const [payoutPending, startPayout] = useTransition();
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [maxActiveOrders, setMaxActiveOrders] = useState(3);
  const [, tick] = useState(0);

  const atActiveLimit = activeOrderCount >= maxActiveOrders;

  const loadMeta = useCallback(() => {
    Promise.all([
      fetch("/api/booster/dashboard"),
      fetch("/api/booster/payouts"),
    ])
      .then(async ([dashRes, payRes]) => {
        const dash = await dashRes.json();
        const pay = await payRes.json();
        if (dashRes.ok) {
          if (dash.earnings) setEarnings(dash.earnings);
          if (typeof dash.queueOnline === "boolean") {
            setQueueOnline(dash.queueOnline);
          }
          if (typeof dash.activeOrderCount === "number") {
            setActiveOrderCount(dash.activeOrderCount);
          }
          if (typeof dash.maxActiveOrders === "number") {
            setMaxActiveOrders(dash.maxActiveOrders);
          }
        }
        if (payRes.ok) {
          setAvailablePayouts(pay.available ?? []);
          const rows = (pay.payouts ?? []) as Array<{
            payout: PayoutRow;
          }>;
          setPayoutHistory(
            rows.map((r) => ({
              id: r.payout.id,
              status: r.payout.status,
              method: r.payout.method,
              amountUsdCents: r.payout.amountUsdCents,
              createdAt: r.payout.createdAt,
            })),
          );
          setIdStatus(pay.idStatus ?? "none");
          setDisputeFreeze(Boolean(pay.disputeFreeze));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta, items.length, activeOrderId]);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const queue = useMemo(
    () => items.filter((i) => i.kind === "offer"),
    [items],
  );
  const active = useMemo(
    () =>
      items.filter(
        (i) =>
          i.workspace === "booster" &&
          i.kind === "order" &&
          isActiveStatus(i.status),
      ),
    [items],
  );
  const history = useMemo(
    () =>
      items.filter(
        (i) =>
          i.workspace === "booster" &&
          i.kind === "order" &&
          isHistoryStatus(i.status),
      ),
    [items],
  );

  const list =
    tab === "queue" ? queue : tab === "active" ? active : history;

  const selectedOffer = queue.find((i) => i.offerId === selectedOfferId) ?? null;

  useEffect(() => {
    if (tab === "queue" && queue.length > 0 && !selectedOfferId && !activeOrderId) {
      onSelectOffer(queue[0]!.offerId!);
    }
  }, [tab, queue, selectedOfferId, activeOrderId, onSelectOffer]);

  useEffect(() => {
    if (activeOrderId) setTab("active");
  }, [activeOrderId]);

  function requestPayout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startPayout(async () => {
      setDeskError(null);
      setPayoutMsg(null);
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
        setDeskError(data.error ?? "Payout request failed");
        return;
      }
      setPayoutMsg("Payout requested — admin sends via Payoneer/Wise.");
      form.reset();
      loadMeta();
      onRefresh();
    });
  }

  return (
    <div className="hs-booster-desk mt-8 space-y-6">
      <div className="space-y-3">
        <BoosterOnlineControl onChange={setQueueOnline} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="hs-panel flex items-center gap-3 p-4">
          <span
            className={
              liveConnected ? "hs-live-dot shrink-0" : "h-2 w-2 shrink-0 rounded-full bg-hs-mute"
            }
            aria-hidden
          />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-hs-mute">
              Live feed
            </div>
            <div className="font-display text-sm text-hs-chalk">
              {liveConnected ? "Connected" : "Connecting…"}
            </div>
          </div>
        </div>
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
        </div>
      </div>

      {assignedGames?.length ? (
        <p className="text-xs text-hs-mute">
          Verified for:{" "}
          {assignedGames.map((g) => gameLabel(g as GameSlug)).join(" · ")}
        </p>
      ) : null}

      <p
        className={`text-xs ${atActiveLimit ? "text-hs-danger" : "text-hs-mute"}`}
      >
        Active slots:{" "}
        <span className="font-display text-hs-chalk">
          {activeOrderCount}/{maxActiveOrders}
        </span>
        {atActiveLimit
          ? " — finish or deliver an order before accepting more."
          : " — assigned + in progress count toward the limit."}
      </p>

      {deskError ? <p className="text-sm text-hs-danger">{deskError}</p> : null}
      {payoutMsg ? <p className="text-sm text-hs-ok">{payoutMsg}</p> : null}

      <div className="flex flex-wrap gap-2 border-b border-hs-line pb-3">
        {(
          [
            ["queue", "Available", queue.length],
            ["active", "Active", active.length],
            ["history", "Completed", history.length],
            ["wallet", "Wallet", availablePayouts.length],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              if (key !== "queue") onSelectOffer(null);
            }}
            className={`border px-4 py-2 text-[10px] uppercase tracking-[0.2em] transition-colors ${
              tab === key
                ? "border-hs-signal bg-hs-signal/15 text-hs-signal"
                : "border-hs-line text-hs-mute hover:border-hs-steel hover:text-hs-chalk"
            }`}
          >
            {label}
            <span className="ml-2 text-hs-steel">({count})</span>
          </button>
        ))}
      </div>

      {tab === "wallet" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="hs-panel space-y-4 p-5">
            <h3 className="font-display text-sm uppercase tracking-widest text-hs-signal">
              Request payout
            </h3>
            <p className="text-sm text-hs-mute">
              ID status:{" "}
              <span className="text-hs-chalk">{idStatus}</span>
              {idStatus !== "approved" ? (
                <>
                  {" "}
                  — upload on{" "}
                  <Link href="/account" className="text-hs-signal underline">
                    profile
                  </Link>
                </>
              ) : null}
            </p>
            {disputeFreeze ? (
              <p className="text-sm text-hs-danger">
                Payouts frozen while a dispute is open.
              </p>
            ) : null}
            {availablePayouts.length === 0 ? (
              <p className="text-sm text-hs-mute">
                No released orders ready to cash out yet.
              </p>
            ) : (
              <form onSubmit={requestPayout} className="grid gap-2">
                <select name="orderId" required className="hs-input">
                  {availablePayouts.map((o) => (
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
                  placeholder="Payout email / account ID"
                  className="hs-input"
                />
                <button
                  type="submit"
                  disabled={
                    payoutPending ||
                    idStatus !== "approved" ||
                    disputeFreeze
                  }
                  className="hs-btn-primary mt-1 disabled:opacity-50"
                >
                  Request payout
                </button>
              </form>
            )}
          </section>
          <section className="hs-panel p-5">
            <h3 className="font-display text-sm uppercase tracking-widest text-hs-signal">
              Payout history
            </h3>
            {payoutHistory.length === 0 ? (
              <p className="mt-4 text-sm text-hs-mute">No payout requests yet.</p>
            ) : (
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto text-sm">
                {payoutHistory.slice(0, 20).map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 border border-hs-line px-3 py-2"
                  >
                    <span className="text-hs-chalk">
                      ${(p.amountUsdCents / 100).toFixed(2)} · {p.method}
                    </span>
                    <span className="text-[10px] uppercase text-hs-mute">
                      {p.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          <div className="hs-scroll max-h-[min(520px,60vh)] space-y-2 overflow-y-auto pr-1">
            {list.length === 0 ? (
              <div className="hs-notify-empty border border-hs-line p-8 text-center text-sm text-hs-mute">
                {tab === "queue"
                  ? queueOnline
                    ? "No orders in the queue. New paid boosts appear here for your games."
                    : "You're offline — turn on pool availability to receive new offers."
                  : tab === "active"
                    ? "No active orders — accept one from Available."
                    : "No completed orders yet."}
              </div>
            ) : tab === "queue" ? (
              list.map((item) => {
                const selected = item.offerId === selectedOfferId;
                return (
                  <div
                    key={item.id}
                    className={`hs-panel w-full border p-3 transition-colors ${
                      selected
                        ? "border-hs-signal/60 bg-hs-signal/10"
                        : "border-hs-line"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectOffer(item.offerId!)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-hs-signal">
                          {item.game} · {item.serviceType}
                        </span>
                        <span className="font-display text-hs-signal">
                          ${(item.amountUsdCents / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={rankIconSrc(item.game as GameSlug, item.startRankKey)}
                          alt=""
                          width={28}
                          height={28}
                        />
                        <span className="text-hs-mute">→</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={rankIconSrc(item.game as GameSlug, item.endRankKey)}
                          alt=""
                          width={28}
                          height={28}
                        />
                        <span className="ml-auto text-[10px] uppercase tracking-wider text-hs-mute">
                          {expiresLabel(item.expiresAt)}
                        </span>
                      </div>
                    </button>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectOffer(item.offerId!)}
                        className="hs-btn-ghost px-3 py-1.5 text-[10px]"
                      >
                        View order
                      </button>
                      <button
                        type="button"
                        disabled={accepting || atActiveLimit}
                        title={
                          atActiveLimit
                            ? `Max ${maxActiveOrders} active orders`
                            : undefined
                        }
                        onClick={() => onAccept(item.offerId!)}
                        className="hs-btn-primary px-3 py-1.5 text-[10px] disabled:opacity-50"
                      >
                        {accepting ? "…" : "Accept offer"}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              list.map((item) => {
                const selected = activeOrderId === item.orderId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectOrder(item.orderId)}
                    className={`hs-panel w-full border p-3 text-left transition-colors ${
                      selected
                        ? "border-hs-signal/60 bg-hs-signal/10"
                        : "border-hs-line hover:border-hs-steel"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-hs-chalk">
                        {item.title}
                      </span>
                      <span className="text-[10px] uppercase text-hs-mute">
                        {item.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-hs-mute">
                      {gameLabel(item.game as GameSlug)} · {item.server}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="hs-notify-card hs-ticket sticky top-20 min-h-[320px] border border-hs-line/90 p-4 lg:max-h-[min(560px,65vh)] lg:overflow-y-auto">
            <p className="text-[10px] uppercase tracking-[0.25em] text-hs-signal">
              Order view
            </p>
            <p className="mt-1 text-xs text-hs-mute">
              Credentials, order details, and live client chat in one view.
            </p>

            {tab === "queue" && selectedOffer ? (
              <div className="mt-4 space-y-4">
                <OrderNotificationCard
                  item={selectedOffer}
                  onAccept={atActiveLimit ? undefined : onAccept}
                  accepting={accepting}
                  hideOrderLink
                />
                <OfferOrderPreview
                  orderId={selectedOffer.orderId}
                  expiresAt={selectedOffer.expiresAt}
                />
                <button
                  type="button"
                  disabled={accepting || !selectedOffer.offerId || atActiveLimit}
                  onClick={() => onAccept(selectedOffer.offerId!)}
                  className="hs-btn-primary w-full py-3 text-sm uppercase tracking-widest disabled:opacity-50"
                >
                  {atActiveLimit
                    ? "Active order limit reached"
                    : accepting
                      ? "Accepting…"
                      : "Accept this offer"}
                </button>
              </div>
            ) : null}

            {tab !== "queue" && activeOrderId ? (
              <OrderDetailWorkspace
                orderId={activeOrderId}
                onOrderChange={() => {
                  loadMeta();
                  onRefresh();
                }}
                focusChat={focusChat}
              />
            ) : null}

            {tab === "queue" && !selectedOffer ? (
              <p className="mt-8 text-sm text-hs-mute">
                Select an available order to see ranks, payout, and claim timer.
              </p>
            ) : null}

            {tab !== "queue" && !activeOrderId ? (
              <p className="mt-8 text-sm text-hs-mute">
                Select an order to open chat and booster tools.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
