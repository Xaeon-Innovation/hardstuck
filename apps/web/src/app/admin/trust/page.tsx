"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";

type ProofRow = {
  proof: {
    id: string;
    game: string;
    claimedRankKey: string;
    server: string;
    imagePath: string;
    profileUrl: string | null;
    status: string;
    createdAt: string;
  };
  userName: string;
  userEmail: string;
  profileStatus: string | null;
};

type Invite = {
  id: string;
  code: string;
  note: string | null;
  usedAt: string | null;
  usedByUserId: string | null;
  createdAt: string;
};

type IdReview = {
  profile: {
    userId: string;
    idImagePath: string | null;
    idSubmittedAt: string | null;
  };
  userName: string;
  userEmail: string;
};

export default function AdminTrustPage() {
  const router = useRouter();
  const [proofs, setProofs] = useState<ProofRow[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [clientInvites, setClientInvites] = useState<Invite[]>([]);
  const [idReviews, setIdReviews] = useState<IdReview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    fetch("/api/admin/trust")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "Forbidden");
          if (r.status === 401 || r.status === 403) router.push("/login");
          return;
        }
        setProofs(data.proofs ?? []);
        setInvites(data.invites ?? []);
        setClientInvites(data.clientInvites ?? []);
        setIdReviews(data.idReviews ?? []);
      })
      .catch(() => setError("Failed to load"));
  }

  useEffect(() => {
    load();
  }, []);

  function review(proofId: string, decision: "approved" | "rejected") {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/admin/trust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review_proof", proofId, decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      setMessage(`Proof ${decision}.`);
      load();
    });
  }

  function reviewId(boosterUserId: string, decision: "approved" | "rejected") {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/admin/trust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review_id", boosterUserId, decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      setMessage(`ID ${decision}.`);
      load();
    });
  }

  function createInvite() {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/admin/trust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_invite", note: "Soft launch" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      setMessage(`Booster invite: ${data.invite.code}`);
      load();
    });
  }

  function createClientInvite() {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/admin/trust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_client_invite",
          note: "Closed beta",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      setMessage(`Client invite: ${data.invite.code}`);
      load();
    });
  }

  return (
    <SiteShell wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/orders"
            className="text-xs uppercase tracking-wider text-hs-mute hover:text-hs-chalk"
          >
            ← Orders
          </Link>
          <p className="hs-page-kicker mt-4">Ops</p>
          <h1 className="hs-page-title">Trust</h1>
          <p className="hs-page-lead">
            Invite boosters, review rank proofs, approve for the pool.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={createInvite}
            className="hs-btn-ghost"
          >
            Booster invite
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={createClientInvite}
            className="hs-btn-ghost"
          >
            Client invite
          </button>
        </div>
      </div>

        {error ? <p className="mt-4 text-hs-danger">{error}</p> : null}
        {message ? <p className="mt-4 text-hs-ok">{message}</p> : null}

        <section className="mt-10">
          <h2 className="font-display text-sm uppercase tracking-widest text-hs-signal">
            Pending rank proofs
          </h2>
          <div className="mt-4 space-y-3">
            {proofs.length === 0 ? (
              <p className="hs-panel p-6 text-hs-mute">No proofs waiting.</p>
            ) : (
              proofs.map(({ proof, userName, userEmail }) => (
                <div
                  key={proof.id}
                  className="hs-panel flex flex-wrap gap-4 p-4"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <a href={proof.imagePath} target="_blank" rel="noreferrer">
                    <img
                      src={proof.imagePath}
                      alt=""
                      className="h-24 w-24 object-cover"
                    />
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="text-hs-chalk">
                      {userName}{" "}
                      <span className="text-hs-mute">({userEmail})</span>
                    </div>
                    <div className="mt-1 text-sm text-hs-mute">
                      {proof.game.toUpperCase()} · {proof.claimedRankKey} ·{" "}
                      {proof.server}
                    </div>
                    {proof.profileUrl ? (
                      <a
                        href={proof.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-hs-signal underline"
                      >
                        External profile
                      </a>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => review(proof.id, "approved")}
                        className="hs-btn-primary px-3 py-1.5 text-xs"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => review(proof.id, "rejected")}
                        className="border border-hs-danger/50 px-3 py-1.5 text-xs uppercase tracking-widest text-hs-danger"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-sm uppercase tracking-widest text-hs-signal">
            Pending ID documents
          </h2>
          <div className="mt-4 space-y-3">
            {idReviews.length === 0 ? (
              <p className="hs-panel p-6 text-hs-mute">No IDs waiting.</p>
            ) : (
              idReviews.map(({ profile, userName, userEmail }) => (
                <div
                  key={profile.userId}
                  className="hs-panel flex flex-wrap gap-4 p-4"
                >
                  {profile.idImagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a href={profile.idImagePath} target="_blank" rel="noreferrer">
                      <img
                        src={profile.idImagePath}
                        alt=""
                        className="h-24 w-24 object-cover"
                      />
                    </a>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="text-hs-chalk">
                      {userName}{" "}
                      <span className="text-hs-mute">({userEmail})</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => reviewId(profile.userId, "approved")}
                        className="hs-btn-primary px-3 py-1.5 text-xs"
                      >
                        Approve ID
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => reviewId(profile.userId, "rejected")}
                        className="border border-hs-danger/50 px-3 py-1.5 text-xs uppercase tracking-widest text-hs-danger"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-sm uppercase tracking-widest text-hs-signal">
            Booster invites
          </h2>
          <div className="mt-4 space-y-2">
            {invites.length === 0 ? (
              <p className="text-sm text-hs-mute">No booster invites yet.</p>
            ) : (
              invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-hs-line px-3 py-2 text-sm"
                >
                  <code className="text-hs-signal">{inv.code}</code>
                  <span className="text-hs-mute">
                    {inv.usedAt
                      ? `Used ${new Date(inv.usedAt).toLocaleString()}`
                      : "Unused"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-sm uppercase tracking-widest text-hs-signal">
            Client invites (closed beta)
          </h2>
          <div className="mt-4 space-y-2">
            {clientInvites.length === 0 ? (
              <p className="text-sm text-hs-mute">No client invites yet.</p>
            ) : (
              clientInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-hs-line px-3 py-2 text-sm"
                >
                  <code className="text-hs-signal">{inv.code}</code>
                  <span className="text-hs-mute">
                    {inv.usedAt
                      ? `Used ${new Date(inv.usedAt).toLocaleString()}`
                      : "Unused"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
    </SiteShell>
  );
}
