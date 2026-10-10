"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
};

export default function HelpPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function load() {
    fetch("/api/tickets")
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.tickets) setTickets(d.tickets);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      setError(null);
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          subject,
          body,
          orderId: orderId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not open ticket");
        if (res.status === 401) router.push("/login");
        return;
      }
      setSubject("");
      setBody("");
      setOrderId("");
      load();
    });
  }

  return (
    <SiteShell>
      <p className="hs-page-kicker">Support</p>
      <h1 className="hs-page-title">Help center</h1>
      <p className="hs-page-lead">
        Open a ticket for billing, delivery, or account questions. Order chat
        stays on the order workspace.
      </p>

      <form onSubmit={submit} className="mt-8 max-w-lg space-y-3">
        <label className="block text-xs uppercase tracking-wider text-hs-mute">
          Subject
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          />
        </label>
        <label className="block text-xs uppercase tracking-wider text-hs-mute">
          Order ID (optional)
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          />
        </label>
        <label className="block text-xs uppercase tracking-wider text-hs-mute">
          Message
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="mt-1 w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          />
        </label>
        {error ? <p className="text-sm text-hs-danger">{error}</p> : null}
        <button type="submit" disabled={pending} className="hs-btn-primary">
          Open ticket
        </button>
      </form>

      <h2 className="mt-12 font-display text-sm uppercase text-hs-signal">
        Your tickets
      </h2>
      <div className="mt-4 space-y-2">
        {tickets.map((t) => (
          <div key={t.id} className="hs-panel p-4">
            <div className="font-display text-hs-chalk">{t.subject}</div>
            <div className="text-xs text-hs-mute">
              {t.status} · {new Date(t.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
        {tickets.length === 0 ? (
          <p className="text-sm text-hs-mute">No tickets yet.</p>
        ) : null}
      </div>
    </SiteShell>
  );
}
