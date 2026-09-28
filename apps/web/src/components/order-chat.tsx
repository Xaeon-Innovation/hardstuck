"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderUserId: string;
  senderName: string | null;
  senderImage: string | null;
};

export function OrderChat({
  orderId,
  currentUserId,
  boosterAssigned = false,
  counterpartLabel = "Counterparty",
  focusOnMount = false,
  embedded = false,
}: {
  orderId: string;
  currentUserId?: string;
  boosterAssigned?: boolean;
  counterpartLabel?: string;
  /** Scroll/focus chat after accept (?chat=1). */
  focusOnMount?: boolean;
  /** Nested inside another panel (notifications workspace). */
  embedded?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const load = useCallback(() => {
    fetch(`/api/orders/${orderId}/messages`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Chat unavailable");
          return;
        }
        const list = (data.messages ?? []) as Message[];
        setMessages(list);
        setError(null);
      })
      .catch(() => setError("Failed to load chat"));
  }, [orderId]);

  useEffect(() => {
    if (!boosterAssigned) return;
    load();
  }, [boosterAssigned, load]);

  useEffect(() => {
    if (!boosterAssigned) return;

    const es = new EventSource(`/api/orders/${orderId}/messages/stream`);

    es.addEventListener("open", () => setLive(true));
    es.addEventListener("error", () => setLive(false));
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(String(e.data)) as { type?: string };
        if (data.type === "connected") setLive(true);
      } catch {
        /* ignore */
      }
    };
    es.addEventListener("chat", () => load());

    const poll = setInterval(load, 5000);

    return () => {
      es.close();
      clearInterval(poll);
      setLive(false);
    };
  }, [orderId, boosterAssigned, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (focusOnMount && boosterAssigned) {
      inputRef.current?.focus();
    }
  }, [focusOnMount, boosterAssigned]);

  function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = String(new FormData(form).get("body") ?? "").trim();
    if (!body) return;
    startTransition(async () => {
      const res = await fetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Send failed");
        return;
      }
      form.reset();
      load();
    });
  }

  if (!boosterAssigned) {
    return (
      <section
        id="order-chat"
        className="hs-notify-card hs-ticket mt-6 border border-hs-line/90 p-6"
      >
        <h2 className="font-display text-sm uppercase tracking-widest text-hs-signal">
          Live chat
        </h2>
        <p className="mt-3 text-sm text-hs-mute">
          Waiting for a booster to accept your order. Once matched, you and your
          booster can chat here in real time.
        </p>
      </section>
    );
  }

  const shellClass = embedded
    ? "flex flex-col border border-hs-line/80 bg-hs-ink/30 p-3"
    : "hs-notify-card hs-ticket mt-6 flex flex-col border border-hs-line/90 p-4";

  return (
    <section id={embedded ? undefined : "order-chat"} className={shellClass}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm uppercase tracking-widest text-hs-signal">
          Live chat
        </h2>
        <span
          className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-widest ${
            live ? "text-hs-ok" : "text-hs-mute"
          }`}
        >
          <span className={live ? "hs-live-dot" : "h-1.5 w-1.5 rounded-full bg-hs-mute"} />
          {live ? "Connected" : "Connecting…"}
        </span>
      </div>
      <p className="mt-1 text-xs text-hs-mute">
        You ↔ {counterpartLabel}. Messages update instantly.
      </p>

      {error ? <p className="mt-2 text-sm text-hs-danger">{error}</p> : null}

      <div className="hs-scroll mt-3 max-h-80 space-y-3 overflow-y-auto border border-hs-line bg-hs-ink/50 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-hs-mute">
            Say hi — your booster is on this order.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderUserId === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}
              >
                {!mine && m.senderImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.senderImage}
                    alt=""
                    className="mt-0.5 h-7 w-7 rounded-full border border-hs-line object-cover"
                  />
                ) : null}
                <div
                  className={`max-w-[85%] px-3 py-2 text-sm ${
                    mine
                      ? "border border-hs-signal/30 bg-hs-signal/15 text-hs-chalk"
                      : "border border-hs-line bg-hs-panel-2 text-hs-chalk"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider text-hs-mute">
                    {mine ? "You" : (m.senderName ?? "Booster")} ·{" "}
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          name="body"
          required
          maxLength={4000}
          placeholder={
            counterpartLabel === "Client"
              ? "Message your client…"
              : "Message your booster…"
          }
          className="hs-input flex-1 text-sm"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={pending}
          className="hs-btn-primary px-4 py-2 text-xs disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}
