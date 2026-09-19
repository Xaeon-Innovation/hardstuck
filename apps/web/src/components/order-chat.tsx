"use client";

import { useEffect, useRef, useState, useTransition } from "react";

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
}: {
  orderId: string;
  currentUserId?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  function load() {
    fetch(`/api/orders/${orderId}/messages`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Chat unavailable");
          return;
        }
        setMessages(data.messages ?? []);
        setError(null);
      })
      .catch(() => setError("Failed to load chat"));
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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

  return (
    <section className="hs-panel mt-4 flex flex-col p-4">
      <h2 className="font-display text-sm uppercase tracking-widest text-hs-signal">
        Order chat
      </h2>
      {error ? <p className="mt-2 text-sm text-hs-danger">{error}</p> : null}
      <div className="mt-3 max-h-72 space-y-3 overflow-y-auto border border-hs-line bg-hs-ink/40 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-hs-mute">No messages yet.</p>
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
                    className="mt-0.5 h-6 w-6 rounded-full object-cover"
                  />
                ) : null}
                <div
                  className={`max-w-[80%] px-3 py-2 text-sm ${
                    mine
                      ? "bg-hs-signal/20 text-hs-chalk"
                      : "bg-hs-panel-2 text-hs-chalk"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider text-hs-mute">
                    {m.senderName ?? "User"} ·{" "}
                    {new Date(m.createdAt).toLocaleString()}
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
          name="body"
          required
          maxLength={4000}
          placeholder="Message…"
          className="flex-1 border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
        />
        <button
          type="submit"
          disabled={pending}
          className="border border-hs-signal/50 px-4 py-2 text-xs uppercase tracking-widest text-hs-signal disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}
