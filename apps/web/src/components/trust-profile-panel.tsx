"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CATALOGS, GameSlugs, type GameSlug } from "@hardstuck/shared";
import {
  RankStatsPanel,
  type RankStatsView,
} from "@/components/rank-stats-panel";
import {
  gameIdentityFields,
  platformFromServer,
} from "@/lib/game-identity";

type Account = {
  id: string;
  game: string;
  riotName: string;
  riotTag: string;
  server: string;
  profileUrl: string | null;
  note: string | null;
  rankSnapshot?: RankStatsView | Record<string, unknown> | null;
  rankSnapshotAt?: string | null;
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
  const [riotName, setRiotName] = useState("");
  const [riotTag, setRiotTag] = useState("");
  const [server, setServer] = useState(CATALOGS.lol.servers[0]!.key);
  const [draftStats, setDraftStats] = useState<RankStatsView | null>(null);

  const catalog = CATALOGS[game];
  const identity = gameIdentityFields(game);

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

  useEffect(() => {
    setServer(CATALOGS[game].servers[0]!.key);
    setDraftStats(null);
    setRiotTag("");
  }, [game]);

  const ranks = useMemo(() => catalog.ranks, [catalog]);

  function saveAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const name = riotName.trim();
      const tag = riotTag.trim();
      if (!name) {
        setError("Name is required");
        return;
      }
      if (identity.tagRequired && !tag) {
        setError("Tag is required");
        return;
      }
      // Optional Apex UID / Marvel placeholder when no discriminator exists.
      const savedTag = identity.tagRequired
        ? tag
        : tag || (game === "apex" ? "—" : server || "pc");

      const profileUrl =
        draftStats?.trackerUrls?.[0]?.url ?? undefined;

      const res = await fetch("/api/trust/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_account",
          game,
          riotName: name,
          riotTag: savedTag,
          server,
          profileUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }

      // Persist live snapshot against this account when lookup already ran.
      await fetch("/api/rank/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game,
          name,
          tag:
            identity.tagRequired || (game === "apex" && tag)
              ? tag
              : undefined,
          server,
          platform: platformFromServer(game, server),
          save: true,
        }),
      }).catch(() => undefined);

      setMessage("Account saved with live rank lookup.");
      setRiotName("");
      setRiotTag("");
      setDraftStats(null);
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
          Save Name#Tag for Duo contact, then look up live rank and stats in the
          same place.
        </p>

        {accounts.length > 0 ? (
          <ul className="space-y-4">
            {accounts.map((a) => {
              const snap =
                a.rankSnapshot &&
                typeof a.rankSnapshot === "object" &&
                "ok" in a.rankSnapshot
                  ? (a.rankSnapshot as RankStatsView)
                  : null;
              const g = GameSlugs.includes(a.game as GameSlug)
                ? (a.game as GameSlug)
                : "lol";
              return (
                <li key={a.id} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div>
                      <span className="text-hs-chalk">
                        {a.riotName}#{a.riotTag}
                      </span>
                      <span className="ml-2 text-hs-mute">
                        {a.game.toUpperCase()} · {a.server}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removeAccount(a.id)}
                      className="text-xs uppercase tracking-wider text-hs-mute hover:text-hs-danger"
                    >
                      Remove
                    </button>
                  </div>
                  <RankStatsPanel
                    game={g}
                    defaultName={a.riotName}
                    defaultTag={a.riotTag}
                    defaultServer={a.server}
                    embedded
                    compact
                    allowManualRank
                    initialResult={snap}
                  />
                </li>
              );
            })}
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
            {GameSlugs.map((g) => (
              <option key={g} value={g}>
                {CATALOGS[g].name}
              </option>
            ))}
          </select>
          <select
            name="server"
            value={server}
            onChange={(e) => setServer(e.target.value)}
            required
            className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
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
            value={riotName}
            onChange={(e) => setRiotName(e.target.value)}
            placeholder={identity.namePlaceholder}
            className={`border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk ${
              identity.showTag ? "" : "sm:col-span-2"
            }`}
          />
          {identity.showTag ? (
            <input
              name="riotTag"
              required={identity.tagRequired}
              value={riotTag}
              onChange={(e) => setRiotTag(e.target.value)}
              placeholder={identity.tagPlaceholder}
              className="border border-hs-line bg-hs-ink px-3 py-2 text-sm text-hs-chalk"
            />
          ) : null}
          <div className="sm:col-span-2">
            <RankStatsPanel
              game={game}
              defaultName={riotName}
              defaultTag={riotTag}
              defaultServer={server}
              embedded
              compact
              allowManualRank
              onResult={setDraftStats}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="border border-hs-signal/50 bg-hs-signal/10 py-2 text-xs uppercase tracking-widest text-hs-signal disabled:opacity-50 sm:col-span-2"
          >
            {pending ? "Saving…" : "Save account"}
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
