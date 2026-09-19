"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CATALOGS, type GameSlug } from "@hardstuck/shared";

type Account = {
  id: string;
  game: string;
  riotName: string;
  riotTag: string;
  server: string;
  profileUrl: string | null;
  note: string | null;
};

type Proof = {
  id: string;
  game: string;
  claimedRankKey: string;
  server: string;
  imagePath: string;
  profileUrl: string | null;
  status: string;
  createdAt: string;
};

type BoosterProfile = {
  status: string;
  games: string[];
  reviewNote: string | null;
  idStatus?: string;
  idImagePath?: string | null;
  idReviewNote?: string | null;
} | null;

export function TrustProfilePanel({
  role,
}: {
  role?: string;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [boosterProfile, setBoosterProfile] = useState<BoosterProfile>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [game, setGame] = useState<GameSlug>("lol");

  const catalog = CATALOGS[game];

  function load() {
    fetch("/api/trust/me")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Failed");
          return;
        }
        setAccounts(data.accounts ?? []);
        setProofs(data.proofs ?? []);
        setBoosterProfile(data.boosterProfile ?? null);
      })
      .catch(() => setError("Failed to load profile"));
  }

  useEffect(() => {
    load();
  }, []);

  const ranks = useMemo(() => catalog.ranks, [catalog]);

  function saveAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const res = await fetch("/api/trust/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_account",
          game: String(form.get("game")),
          riotName: String(form.get("riotName")),
          riotTag: String(form.get("riotTag")),
          server: String(form.get("server")),
          profileUrl: String(form.get("profileUrl") ?? "") || undefined,
          note: String(form.get("note") ?? "") || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }
      setMessage("Account details saved.");
      formEl.reset();
      load();
    });
  }

  function removeAccount(id: string) {
    startTransition(async () => {
      await fetch("/api/trust/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_account", id }),
      });
      load();
    });
  }

  function redeemInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "");
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/trust/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeem_invite", code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invite failed");
        return;
      }
      setMessage("Invite redeemed — submit rank proof for review.");
      load();
      window.location.reload();
    });
  }

  function submitProof(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("action", "submit_rank_proof");
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const res = await fetch("/api/trust/me", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setMessage("Rank proof submitted for admin review.");
      form.reset();
      load();
    });
  }

  function submitId(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("action", "submit_id");
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const res = await fetch("/api/trust/me", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "ID upload failed");
        return;
      }
      setMessage("ID submitted for admin review.");
      form.reset();
      load();
    });
  }

  const isBooster = role === "booster" || role === "admin" || Boolean(boosterProfile);

  return (
    <div className="space-y-10">
      {error ? <p className="text-sm text-hs-danger">{error}</p> : null}
      {message ? <p className="text-sm text-hs-ok">{message}</p> : null}

      <section className="space-y-4">
        <h2 className="font-display text-sm uppercase tracking-widest text-hs-signal">
          Game accounts
        </h2>
        <p className="text-sm text-hs-mute">
          Riot Name#Tag used for Duo contact and booster verification.
        </p>

        {accounts.length > 0 ? (
          <ul className="space-y-2">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="hs-panel flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
              >
                <div>
                  <span className="text-hs-chalk">
                    {a.riotName}#{a.riotTag}
                  </span>
                  <span className="ml-2 text-hs-mute">
                    {a.game.toUpperCase()} · {a.server}
                  </span>
                  {a.profileUrl ? (
                    <a
                      href={a.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-hs-signal underline"
                    >
                      profile
                    </a>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => removeAccount(a.id)}
                  className="text-xs uppercase tracking-wider text-hs-mute hover:text-hs-danger"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-hs-mute">No accounts saved yet.</p>
        )}

        <form onSubmit={saveAccount} className="hs-panel grid gap-2 p-4 sm:grid-cols-2">
          <select
            name="game"
            value={game}
            onChange={(e) => setGame(e.target.value as GameSlug)}
            className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          >
            <option value="lol">League of Legends</option>
            <option value="valorant">Valorant</option>
          </select>
          <select
            name="server"
            key={`server-${game}`}
            required
            className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
            defaultValue={catalog.servers[0]?.key}
          >
            {catalog.servers.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            name="riotName"
            required
            placeholder="Riot name"
            className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          />
          <input
            name="riotTag"
            required
            placeholder="Tag (e.g. EUW)"
            className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
          />
          <input
            name="profileUrl"
            placeholder="op.gg / tracker.gg URL (optional)"
            className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk sm:col-span-2"
          />
          <input
            name="note"
            placeholder="Note (optional)"
            className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk sm:col-span-2"
          />
          <button
            type="submit"
            disabled={pending}
            className="border border-hs-signal/50 bg-hs-signal/10 py-2 text-xs uppercase tracking-widest text-hs-signal disabled:opacity-50 sm:col-span-2"
          >
            Save account
          </button>
        </form>
      </section>

      {!isBooster ? (
        <section className="space-y-3">
          <h2 className="font-display text-sm uppercase tracking-widest text-hs-signal">
            Become a booster
          </h2>
          <p className="text-sm text-hs-mute">
            Boosters are invite-only. Redeem a code from HardStuck, then upload
            rank proof.
          </p>
          <form onSubmit={redeemInvite} className="flex gap-2">
            <input
              name="code"
              required
              placeholder="Invite code"
              className="flex-1 border border-hs-line bg-hs-panel px-3 py-2 text-sm text-hs-chalk"
            />
            <button
              type="submit"
              disabled={pending}
              className="border border-hs-signal/50 px-4 py-2 text-xs uppercase tracking-widest text-hs-signal"
            >
              Redeem
            </button>
          </form>
        </section>
      ) : (
        <section className="space-y-4">
          <h2 className="font-display text-sm uppercase tracking-widest text-hs-signal">
            Rank proof
          </h2>
          <p className="text-sm text-hs-mute">
            Status:{" "}
            <span className="text-hs-chalk">
              {(boosterProfile?.status ?? "pending").replaceAll("_", " ")}
            </span>
            {boosterProfile?.reviewNote ? (
              <span className="text-hs-mute"> — {boosterProfile.reviewNote}</span>
            ) : null}
          </p>

          {proofs.length > 0 ? (
            <ul className="space-y-2">
              {proofs.map((p) => (
                <li key={p.id} className="hs-panel flex items-center gap-3 p-3 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imagePath}
                    alt=""
                    className="h-12 w-12 object-cover"
                  />
                  <div>
                    <div className="text-hs-chalk">
                      {p.game.toUpperCase()} · {p.claimedRankKey} · {p.server}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-hs-mute">
                      {p.status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {boosterProfile?.status !== "approved" ? (
            <form
              onSubmit={submitProof}
              className="hs-panel grid gap-2 p-4 sm:grid-cols-2"
            >
              <select
                name="game"
                value={game}
                onChange={(e) => setGame(e.target.value as GameSlug)}
                className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
              >
                <option value="lol">League of Legends</option>
                <option value="valorant">Valorant</option>
              </select>
              <select
                name="server"
                key={`proof-server-${game}`}
                required
                className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
              >
                {catalog.servers.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                name="claimedRankKey"
                key={`rank-${game}`}
                required
                className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk sm:col-span-2"
              >
                {ranks.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
              <input
                name="profileUrl"
                placeholder="op.gg / tracker URL (optional)"
                className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk sm:col-span-2"
              />
              <input
                name="image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                className="text-sm text-hs-mute sm:col-span-2"
              />
              <button
                type="submit"
                disabled={pending}
                className="bg-hs-signal py-2.5 font-display text-xs uppercase tracking-widest text-hs-ink disabled:opacity-50 sm:col-span-2"
              >
                {pending ? "Uploading…" : "Submit rank proof"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-hs-ok">
              Verified — you can receive matched-pool offers.
            </p>
          )}

          <div className="space-y-3 border-t border-hs-line pt-6">
            <h3 className="font-display text-sm uppercase tracking-widest text-hs-signal">
              ID verification
            </h3>
            <p className="text-sm text-hs-mute">
              Required before first payout. Status:{" "}
              <span className="text-hs-chalk">
                {(boosterProfile?.idStatus ?? "none").replaceAll("_", " ")}
              </span>
              {boosterProfile?.idReviewNote ? (
                <span> — {boosterProfile.idReviewNote}</span>
              ) : null}
            </p>
            {boosterProfile?.idStatus !== "approved" ? (
              <form onSubmit={submitId} className="hs-panel space-y-2 p-4">
                <input
                  name="image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  className="text-sm text-hs-mute"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="border border-hs-signal/50 px-4 py-2 text-xs uppercase tracking-widest text-hs-signal disabled:opacity-50"
                >
                  {pending ? "Uploading…" : "Submit ID photo"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-hs-ok">ID approved — payouts unlocked.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
