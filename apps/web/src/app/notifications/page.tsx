"use client";



import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import Link from "next/link";

import { useRouter, useSearchParams } from "next/navigation";

import type { GameSlug } from "@hardstuck/shared";

import { authClient } from "@/lib/auth-client";

import { SiteShell } from "@/components/site-shell";

import { BoosterDeskPanel } from "@/components/booster/booster-desk-panel";
import { BoosterOnlineControl } from "@/components/booster/booster-online-control";
import { OrderDetailWorkspace } from "@/components/notifications/order-detail-workspace";
import { OrderNotificationCard } from "@/components/notifications/order-notification-card";

import {

  useBoosterLive,

  useBoosterOfferStream,

} from "@/components/booster-live-provider";

import { gameLabel } from "@/lib/assets";

import type { NotificationFeed, NotificationItem } from "@/lib/notification-types";

import {

  canUseBoosterDesk,

  hasPlatformWideAccess,

  isBooster,

} from "@/lib/roles";



const ALL_GAMES: GameSlug[] = [

  "lol",

  "valorant",

  "overwatch",

  "marvel_rivals",

  "apex",

];



function scrollToOrder(orderId: string) {

  requestAnimationFrame(() => {

    document

      .getElementById(`notify-order-${orderId}`)

      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  });

}



export default function NotificationsPage() {

  const router = useRouter();

  const searchParams = useSearchParams();

  const { data: session, isPending } = authClient.useSession();

  const role = (session?.user as { role?: string } | undefined)?.role;

  const live = useBoosterLive();

  const boosterOnly = isBooster(role) && !hasPlatformWideAccess(role);



  const [feed, setFeed] = useState<NotificationFeed | null>(null);

  const [gameFilter, setGameFilter] = useState("all");

  const [error, setError] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();

  const [activeOrderId, setActiveOrderId] = useState<string | null>(
    () => searchParams.get("order"),
  );
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);



  useEffect(() => {

    const fromUrl = searchParams.get("order");

    if (fromUrl) setActiveOrderId(fromUrl);

  }, [searchParams]);



  function openOrder(orderId: string) {
    setSelectedOfferId(null);
    setActiveOrderId(orderId);
    const next = new URLSearchParams(searchParams.toString());
    next.set("order", orderId);
    router.replace(`/notifications?${next.toString()}`, { scroll: false });
    if (!boosterOnly) scrollToOrder(orderId);
  }



  function toggleOrder(orderId: string) {

    if (activeOrderId === orderId) {

      setActiveOrderId(null);

      const next = new URLSearchParams(searchParams.toString());

      next.delete("order");

      const q = next.toString();

      router.replace(q ? `/notifications?${q}` : "/notifications", {

        scroll: false,

      });

      return;

    }

    openOrder(orderId);

  }



  const load = useCallback(() => {

    const q =

      gameFilter !== "all"

        ? `?game=${encodeURIComponent(gameFilter)}`

        : "";

    fetch(`/api/notifications${q}`)

      .then(async (r) => {

        const data = (await r.json()) as NotificationFeed & { error?: string };

        if (!r.ok) {

          if (r.status === 401) router.push("/login");

          setError(data.error ?? "Failed to load");

          return;

        }

        setFeed(data);

        setError(null);

      })

      .catch(() => setError("Failed to load"));

  }, [gameFilter, router]);



  useEffect(() => {

    if (isPending) return;

    if (!session?.user) {

      router.push("/login");

      return;

    }

    load();

    live?.markAllRead();

  }, [isPending, session?.user, load, router, live]);



  useEffect(() => {

    if (!activeOrderId) return;

    scrollToOrder(activeOrderId);

  }, [activeOrderId, feed?.items.length]);



  useBoosterOfferStream(

    useCallback(() => {

      load();

    }, [load]),

  );



  const gameTabs = useMemo(() => {

    if (hasPlatformWideAccess(role)) {

      return ["all", ...ALL_GAMES];

    }

    if (isBooster(role) && feed?.assignedGames?.length) {

      return ["all", ...feed.assignedGames];

    }

    const fromItems = feed?.items.map((i) => i.game) ?? [];

    const unique = Array.from(new Set(fromItems));

    if (unique.length === 0) return ["all", ...ALL_GAMES];

    return ["all", ...unique];

  }, [feed, role]);



  const items: NotificationItem[] = feed?.items ?? [];



  function accept(offerId: string) {

    startTransition(async () => {

      setError(null);

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

      const orderId = String(data.orderId ?? "");

      load();

      if (orderId) openOrder(orderId);

    });

  }



  const roleLabel =

    role === "admin"

      ? "Admin"

      : role === "booster"

        ? "Booster"

        : "Client";



  const lead = hasPlatformWideAccess(role)

    ? "Full platform view — every game, pool offers, and all orders."

    : isBooster(role)

      ? "Order queue, active jobs, live chat, and earnings — one booster dashboard."

      : "Pay, track boosts, chat with your booster, and manage vault credentials.";



  return (

    <SiteShell wide>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <p className="hs-page-kicker">{roleLabel} · Notifications</p>

          <h1 className="hs-page-title">

            Notifications

          </h1>

          <p className="hs-page-lead">{lead}</p>

        </div>

        <div className="flex items-center gap-3 text-xs uppercase tracking-widest">

          {boosterOnly ? (
            <BoosterOnlineControl compact />
          ) : canUseBoosterDesk(role) ? (
            <span
              className={`inline-flex items-center gap-2 border px-3 py-1.5 ${
                live?.connected
                  ? "border-hs-ok/50 text-hs-ok"
                  : "border-hs-line text-hs-mute"
              }`}
            >
              <span
                className={
                  live?.connected
                    ? "hs-live-dot"
                    : "h-1.5 w-1.5 rounded-full bg-hs-mute"
                }
                aria-hidden
              />
              {live?.connected ? "Live" : "Connecting…"}
            </span>
          ) : null}

          {hasPlatformWideAccess(role) ? (

            <>

              <Link href="/admin/orders" className="hs-btn-ghost px-3 py-2 text-xs">

                Admin

              </Link>

              <Link href="/booster" className="hs-btn-ghost px-3 py-2 text-xs">

                Booster desk

              </Link>

            </>

          ) : null}

          {role === "client" ? (

            <Link href="/boost" className="hs-btn-primary px-3 py-2 text-xs">

              New boost

            </Link>

          ) : null}

        </div>

      </div>



      {hasPlatformWideAccess(role) ? (

        <p className="mt-4 text-xs text-hs-mute">

          Admin access — all games and platform orders.

        </p>

      ) : isBooster(role) && feed?.assignedGames?.length ? (

        <p className="mt-4 text-xs text-hs-mute">

          Your games:{" "}

          {feed.assignedGames.map((g) => gameLabel(g as GameSlug)).join(" · ")}

        </p>

      ) : null}



      <div className="mt-6 flex flex-wrap gap-2">

        {gameTabs.map((g) => (

          <button

            key={g}

            type="button"

            onClick={() => setGameFilter(g)}

            className={`border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors ${

              gameFilter === g

                ? "border-hs-signal bg-hs-signal/15 text-hs-signal"

                : "border-hs-line text-hs-mute hover:border-hs-steel hover:text-hs-chalk"

            }`}

          >

            {g === "all" ? "All games" : gameLabel(g as GameSlug)}

          </button>

        ))}

      </div>



      {error ? <p className="mt-4 text-sm text-hs-danger">{error}</p> : null}

      {boosterOnly ? (
        <BoosterDeskPanel
          items={items}
          activeOrderId={activeOrderId}
          selectedOfferId={selectedOfferId}
          onSelectOffer={setSelectedOfferId}
          onSelectOrder={openOrder}
          onAccept={accept}
          accepting={pending}
          onRefresh={load}
          liveConnected={live?.connected}
          focusChat={searchParams.get("chat") === "1"}
          assignedGames={feed?.assignedGames}
        />
      ) : null}

      {!boosterOnly &&
      activeOrderId &&
      !items.some(
        (i) => i.orderId === activeOrderId && i.workspace,
      ) ? (
        <section className="hs-notify-card hs-ticket mt-8 border border-hs-line/90 p-4">
          <OrderDetailWorkspace
            orderId={activeOrderId}
            onOrderChange={load}
            focusChat={searchParams.get("chat") === "1"}
          />
        </section>
      ) : null}

      {!boosterOnly ? (
      <section className="mt-8 space-y-4">

        {items.length === 0 && !error ? (

          <div className="hs-notify-empty hs-ticket border border-hs-line p-10 text-center">

            <p className="font-display text-lg uppercase text-hs-chalk">

              Nothing here yet

            </p>

            <p className="mt-2 text-sm text-hs-mute">

              {role === "booster"

                ? "Orders appear when clients pay for a game you are verified for."

                : role === "client"

                  ? "Place a boost from the calculator to get started."

                  : "No recent orders on the platform."}

            </p>

            {role === "client" ? (

              <Link href="/boost" className="hs-btn-ghost mt-6 inline-flex">

                Open calculator

              </Link>

            ) : null}

          </div>

        ) : (

          items.map((item) => (

            <OrderNotificationCard

              key={item.id}

              item={item}

              onAccept={

                boosterOnly && item.kind === "offer" ? accept : undefined

              }

              accepting={pending}

              hideOrderLink={Boolean(item.workspace) || boosterOnly}

              expanded={

                Boolean(item.workspace) && activeOrderId === item.orderId

              }

              onToggleExpand={

                item.workspace ? () => toggleOrder(item.orderId) : undefined

              }

              workspace={

                item.workspace && activeOrderId === item.orderId ? (

                  <OrderDetailWorkspace

                    orderId={item.orderId}

                    onOrderChange={load}

                    focusChat={searchParams.get("chat") === "1"}

                  />

                ) : undefined

              }

            />

          ))

        )}

      </section>
      ) : null}

    </SiteShell>

  );

}

