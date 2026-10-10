"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { SiteShell } from "@/components/site-shell";

type TicketRow = {
  ticket: {
    id: string;
    subject: string;
    status: string;
    priority: string;
    orderId: string | null;
    createdAt: string;
  };
  userName: string;
  userEmail: string;
};

type Reply = {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback(() => {
    fetch("/api/admin/tickets")
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) setTickets(data.tickets ?? []);
      })
      .catch(() => setError("Failed to load"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openTicket(id: string) {
    setSelected(id);
    fetch(`/api/admin/tickets?id=${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) setReplies(data.replies ?? []);
      })
      .catch(() => undefined);
  }

  function reply() {
    if (!selected || !body.trim()) return;
    start(async () => {
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          ticketId: selected,
          body,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      setBody("");
      openTicket(selected);
      load();
    });
  }

  function setStatus(status: string) {
    if (!selected) return;
    start(async () => {
      await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_status",
          ticketId: selected,
          status,
        }),
      });
      load();
      openTicket(selected);
    });
  }

  return (
    <SiteShell wide>
      <p className="hs-page-kicker">Ops</p>
      <h1 className="hs-page-title">Support tickets</h1>
      {error ? <p className="mt-4 text-sm text-hs-danger">{error}</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          {tickets.map((t) => (
            <button
              key={t.ticket.id}
              type="button"
              onClick={() => openTicket(t.ticket.id)}
              className={`hs-panel w-full p-4 text-left ${
                selected === t.ticket.id ? "border-hs-signal" : ""
              }`}
            >
              <div className="font-display text-hs-chalk">
                {t.ticket.subject}
              </div>
              <div className="text-xs text-hs-mute">
                {t.userEmail} · {t.ticket.status} · {t.ticket.priority}
              </div>
            </button>
          ))}
          {tickets.length === 0 ? (
            <p className="text-sm text-hs-mute">No tickets.</p>
          ) : null}
        </div>

        {selected ? (
          <div className="hs-panel space-y-4 p-4">
            <div className="flex flex-wrap gap-2">
              {["open", "pending", "resolved"].map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pending}
                  onClick={() => setStatus(s)}
                  className="border border-hs-line px-2 py-1 text-[10px] uppercase tracking-widest text-hs-mute"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {replies.map((r) => (
                <div
                  key={r.id}
                  className={`text-sm ${r.isStaff ? "text-hs-signal" : "text-hs-chalk"}`}
                >
                  <div className="text-[10px] uppercase tracking-widest text-hs-mute">
                    {r.isStaff ? "Staff" : "Client"} ·{" "}
                    {new Date(r.createdAt).toLocaleString()}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{r.body}</p>
                </div>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="w-full border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
              placeholder="Staff reply…"
            />
            <button
              type="button"
              disabled={pending}
              onClick={reply}
              className="hs-btn-primary"
            >
              Send reply
            </button>
          </div>
        ) : null}
      </div>
    </SiteShell>
  );
}
