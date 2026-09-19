"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { SiteShell } from "@/components/site-shell";
import { PasswordInput } from "@/components/password-input";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [closedBeta, setClosedBeta] = useState(true);

  useEffect(() => {
    fetch("/api/beta/register")
      .then(async (r) => {
        const data = await r.json();
        setClosedBeta(Boolean(data.closedBeta));
      })
      .catch(() => setClosedBeta(true));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const inviteCode = String(form.get("inviteCode") ?? "").trim();
    const risk = form.get("risk") === "on";

    if (!risk) {
      setError("You must accept the risk disclosure.");
      setPending(false);
      return;
    }

    const res = await fetch("/api/beta/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        inviteCode: inviteCode || undefined,
        riskAccepted: true as const,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPending(false);
      setError(typeof data.error === "string" ? data.error : "Sign up failed");
      return;
    }

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    setPending(false);
    if (signInError) {
      setError("Account created — please sign in.");
      router.push("/login");
      return;
    }
    router.push("/boost");
  }

  return (
    <SiteShell>
      <p className="hs-page-kicker">Closed beta</p>
      <h1 className="hs-page-title">Create account</h1>
      <p className="hs-page-lead">
        Boosting may violate publisher Terms of Service and can risk account
        sanctions. Proceed only if you accept that risk.
      </p>

      {closedBeta ? (
        <p className="mt-5 max-w-md border border-hs-signal/40 bg-hs-signal/10 px-3 py-2 text-xs text-hs-signal">
          Invite code required for closed beta.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 flex max-w-md flex-col gap-3">
        <input
          name="name"
          required
          placeholder="Display name"
          className="hs-input"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="hs-input"
        />
        <PasswordInput
          name="password"
          required
          minLength={12}
          placeholder="Password (12+ chars)"
          className="hs-input pr-10"
        />
        {closedBeta ? (
          <input
            name="inviteCode"
            required
            placeholder="Invite code"
            className="hs-input"
          />
        ) : null}
        <p className="text-xs text-hs-mute">
          Boosters redeem a separate invite later on{" "}
          <Link href="/account" className="text-hs-signal underline">
            profile
          </Link>
          .
        </p>
        <label className="flex items-start gap-2 text-sm text-hs-mute">
          <input name="risk" type="checkbox" className="mt-1 accent-hs-signal" />
          I understand HardStuck is a gray-market boosting service and accept
          the account / ToS risks.
        </label>
        {error ? <p className="text-sm text-hs-danger">{error}</p> : null}
        <button type="submit" disabled={pending} className="hs-btn-primary">
          {pending ? "Creating…" : "Register"}
        </button>
      </form>
      <Link
        href="/login"
        className="mt-5 inline-block text-sm text-hs-mute underline hover:text-hs-chalk"
      >
        Already have an account?
      </Link>
    </SiteShell>
  );
}
