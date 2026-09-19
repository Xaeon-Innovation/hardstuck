"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { SiteShell } from "@/components/site-shell";
import { PasswordInput } from "@/components/password-input";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    setPending(false);
    if (signInError) {
      setError(signInError.message ?? "Sign in failed");
      return;
    }
    router.push("/boost");
  }

  return (
    <SiteShell>
      <p className="hs-page-kicker">Account</p>
      <h1 className="hs-page-title">Sign in</h1>
      <p className="hs-page-lead">Pick up where you left your climb.</p>

      <form onSubmit={onSubmit} className="mt-8 flex max-w-md flex-col gap-3">
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
          placeholder="Password"
          className="hs-input pr-10"
        />
        {error ? <p className="text-sm text-hs-danger">{error}</p> : null}
        <button type="submit" disabled={pending} className="hs-btn-primary">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <Link
        href="/register"
        className="mt-5 inline-block text-sm text-hs-mute underline hover:text-hs-chalk"
      >
        Create an account
      </Link>
    </SiteShell>
  );
}
