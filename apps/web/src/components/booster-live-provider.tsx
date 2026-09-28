"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { canUseBoosterDesk } from "@/lib/roles";
import {
  BOOSTER_OFFER_EVENT,
  dispatchBoosterOffer,
  type BoosterLiveOfferPayload,
} from "@/lib/booster-live-events";
import {
  OfferNotificationCard,
  type OfferNotification,
} from "@/components/booster/offer-notification-card";

type BoosterLiveContextValue = {
  connected: boolean;
  feed: OfferNotification[];
  unreadCount: number;
  markAllRead: () => void;
  dismissToast: (key: string) => void;
};

const BoosterLiveContext = createContext<BoosterLiveContextValue | null>(null);

export function useBoosterLive() {
  const ctx = useContext(BoosterLiveContext);
  return ctx;
}

export function useBoosterOfferStream(
  onOffer: (payload: BoosterLiveOfferPayload) => void,
) {
  useEffect(() => {
    function handler(e: Event) {
      onOffer((e as CustomEvent<BoosterLiveOfferPayload>).detail);
    }
    window.addEventListener(BOOSTER_OFFER_EVENT, handler);
    return () => window.removeEventListener(BOOSTER_OFFER_EVENT, handler);
  }, [onOffer]);
}

type Toast = OfferNotification & { key: string };

function pushFeed(
  prev: OfferNotification[],
  payload: BoosterLiveOfferPayload,
): OfferNotification[] {
  if (prev.some((p) => p.offer.id === payload.offer.id)) return prev;
  return [
    {
      ...payload,
      receivedAt: new Date().toISOString(),
    },
    ...prev,
  ].slice(0, 50);
}

export function BoosterLiveProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isBooster = canUseBoosterDesk(role);
  const isPlainBooster = role === "booster";
  const [accepting, startAccept] = useTransition();

  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState<OfferNotification[]>([]);
  const [lastReadAt, setLastReadAt] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const ingest = useCallback((payload: BoosterLiveOfferPayload) => {
    if (payload.type !== "offer.new") return;
    dispatchBoosterOffer(payload);
    setFeed((prev) => pushFeed(prev, payload));
    setToasts((prev) => [
      ...prev.slice(-3),
      {
        ...payload,
        receivedAt: new Date().toISOString(),
        key: `${payload.offer.id}-${Date.now()}`,
      },
    ]);
  }, []);

  useEffect(() => {
    if (!isBooster) {
      setConnected(false);
      return;
    }

    const es = new EventSource("/api/booster/live");

    es.addEventListener("open", () => setConnected(true));
    es.addEventListener("error", () => setConnected(false));

    function onOffer(e: MessageEvent) {
      try {
        const payload = JSON.parse(String(e.data)) as BoosterLiveOfferPayload;
        ingest(payload);
      } catch {
        /* ignore */
      }
    }

    es.addEventListener("offer", onOffer);
    return () => {
      es.close();
      setConnected(false);
    };
  }, [isBooster, ingest]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const t = window.setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 14_000);
    return () => window.clearTimeout(t);
  }, [toasts]);

  const unreadCount = useMemo(() => {
    return feed.filter((item) => {
      const t = item.receivedAt
        ? new Date(item.receivedAt).getTime()
        : Date.now();
      return t > lastReadAt;
    }).length;
  }, [feed, lastReadAt]);

  const acceptOffer = useCallback(
    (offerId: string) => {
      startAccept(async () => {
        const res = await fetch("/api/booster/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "accept", offerId }),
        });
        const data = await res.json();
        if (!res.ok) return;
        const orderId = String(data.orderId ?? "");
        router.push(
          typeof data.chatUrl === "string"
            ? data.chatUrl
            : orderId
              ? `/notifications?order=${orderId}`
              : "/notifications",
        );
      });
    },
    [router],
  );

  const value = useMemo(
    () => ({
      connected,
      feed,
      unreadCount,
      markAllRead: () => setLastReadAt(Date.now()),
      dismissToast: (key: string) =>
        setToasts((prev) => prev.filter((t) => t.key !== key)),
    }),
    [connected, feed, unreadCount],
  );

  return (
    <BoosterLiveContext.Provider value={value}>
      {children}
      {isPlainBooster && toasts.length > 0 ? (
        <div
          className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(100vw-2rem,24rem)] flex-col gap-3"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div key={t.key} className="pointer-events-auto">
              <OfferNotificationCard
                item={t}
                variant="toast"
                onAccept={acceptOffer}
                accepting={accepting}
                onDismiss={() => value.dismissToast(t.key)}
              />
            </div>
          ))}
        </div>
      ) : null}
    </BoosterLiveContext.Provider>
  );
}
