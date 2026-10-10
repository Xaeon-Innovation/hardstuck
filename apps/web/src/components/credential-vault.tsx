"use client";

import { useEffect, useState, useTransition } from "react";

type Meta = {
  applicable: boolean;
  hasCredentials?: boolean;
  wiped?: boolean;
  canDeposit?: boolean;
  canReveal?: boolean;
};

export function CredentialVault({ orderId }: { orderId: string }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{
    username: string;
    password: string;
    note?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    fetch(`/api/orders/${orderId}/credentials`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Failed");
          return;
        }
        setMeta(data);
      })
      .catch(() => setError("Failed to load vault"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (!meta) {
    return (
      <div className="hs-panel mt-4 p-4 text-sm text-hs-mute">
        {error ?? "Loading vault…"}
      </div>
    );
  }

  if (!meta.applicable) return null;

  function deposit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/orders/${orderId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deposit",
          username: String(form.get("username") ?? ""),
          password: String(form.get("password") ?? ""),
          note: String(form.get("note") ?? "") || undefined,
          label: String(form.get("label") ?? "") || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Deposit failed");
        return;
      }
      formEl.reset();
      load();
    });
  }

  function reveal() {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/orders/${orderId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reveal" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Reveal failed");
        return;
      }
      setRevealed(data.secrets);
    });
  }

  return (
    <section className="hs-panel mt-4 space-y-3 p-4">
      <h2 className="font-display text-sm uppercase tracking-widest text-hs-signal">
        Solo vault
      </h2>
      <p className="text-xs text-hs-mute">
        Encrypted at rest. Reveals are audited. Wiped after release hold +
        retention (disputes freeze wipe).
      </p>
      {error ? <p className="text-sm text-hs-danger">{error}</p> : null}
      {meta.wiped ? (
        <p className="text-sm text-hs-mute">Credentials wiped for this order.</p>
      ) : null}
      {meta.hasCredentials ? (
        <p className="text-sm text-hs-ok">Credentials on file.</p>
      ) : (
        <p className="text-sm text-hs-mute">No credentials deposited yet.</p>
      )}

      {meta.canDeposit && !meta.wiped ? (
        <form onSubmit={deposit} className="grid gap-2 sm:grid-cols-2">
          <input
            name="username"
            required
            placeholder="Account login"
            className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          />
          <input
            name="label"
            placeholder="Label (optional)"
            className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk sm:col-span-2"
          />
          <input
            name="note"
            placeholder="Note for booster (optional)"
            className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk sm:col-span-2"
          />
          <button
            type="submit"
            disabled={pending}
            className="border border-hs-signal/50 bg-hs-signal/10 py-2 text-xs uppercase tracking-widest text-hs-signal disabled:opacity-50 sm:col-span-2"
          >
            {pending ? "Saving…" : meta.hasCredentials ? "Update vault" : "Deposit"}
          </button>
        </form>
      ) : null}

      {meta.canReveal && meta.hasCredentials ? (
        <div className="space-y-2">
          <button
            type="button"
            disabled={pending}
            onClick={reveal}
            className="border border-hs-line px-3 py-2 text-xs uppercase tracking-widest text-hs-chalk hover:border-hs-signal disabled:opacity-50"
          >
            Reveal (audited)
          </button>
          {revealed ? (
            <dl className="border border-hs-line bg-hs-ink/60 p-3 text-sm">
              <div>
                <dt className="text-[10px] uppercase text-hs-mute">Login</dt>
                <dd className="font-mono text-hs-chalk">{revealed.username}</dd>
              </div>
              <div className="mt-2">
                <dt className="text-[10px] uppercase text-hs-mute">Password</dt>
                <dd className="font-mono text-hs-chalk">{revealed.password}</dd>
              </div>
              {revealed.note ? (
                <div className="mt-2">
                  <dt className="text-[10px] uppercase text-hs-mute">Note</dt>
                  <dd className="text-hs-mute">{revealed.note}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
