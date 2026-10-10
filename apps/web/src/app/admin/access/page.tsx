"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { UserRoles } from "@hardstuck/shared";
import { SiteShell } from "@/components/site-shell";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  suspendedAt: string | null;
  createdAt: string;
};

type Audit = {
  id: string;
  action: string;
  targetUserId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
};

export default function AdminAccessPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    fetch(`/api/admin/access?${params}`)
      .then(async (r) => {
        const data = await resJson(r);
        if (!r.ok) {
          setError(data.error ?? "Failed");
          return;
        }
        setUsers(data.users ?? []);
        setAudit(data.audit ?? []);
      })
      .catch(() => setError("Failed to load"));
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  function act(action: string, userId: string, role?: string) {
    start(async () => {
      setError(null);
      const res = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      load();
    });
  }

  return (
    <SiteShell wide>
      <p className="hs-page-kicker">Ops</p>
      <h1 className="hs-page-title">Access control</h1>
      <p className="hs-page-lead">
        Set roles and suspend accounts. Last admin cannot be demoted.
      </p>

      <div className="mt-6 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
        />
        <button
          type="button"
          onClick={load}
          className="border border-hs-line px-3 py-2 text-[10px] uppercase tracking-widest text-hs-mute"
        >
          Search
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-hs-danger">{error}</p> : null}

      <div className="mt-6 space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="hs-panel flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <div className="font-display text-hs-chalk">{u.name}</div>
              <div className="text-xs text-hs-mute">
                {u.email} · {u.role}
                {u.suspendedAt ? " · SUSPENDED" : ""}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                defaultValue={u.role}
                disabled={pending}
                onChange={(e) => act("set_role", u.id, e.target.value)}
                className="border border-hs-line bg-hs-ink px-2 py-1.5 text-xs text-hs-chalk"
              >
                {UserRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {u.suspendedAt ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act("unsuspend", u.id)}
                  className="border border-hs-ok/40 px-2 py-1.5 text-[10px] uppercase tracking-widest text-hs-ok"
                >
                  Unsuspend
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending || u.role === "admin"}
                  onClick={() => act("suspend", u.id)}
                  className="border border-hs-danger/40 px-2 py-1.5 text-[10px] uppercase tracking-widest text-hs-danger"
                >
                  Suspend
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-display text-sm uppercase text-hs-signal">
        Audit log
      </h2>
      <div className="mt-3 space-y-1 text-xs text-hs-mute">
        {audit.map((a) => (
          <div key={a.id}>
            {new Date(a.createdAt).toLocaleString()} · {a.action}
            {a.targetUserId ? ` · ${a.targetUserId.slice(0, 8)}` : ""}
          </div>
        ))}
      </div>
    </SiteShell>
  );
}

async function resJson(r: Response) {
  return r.json();
}
