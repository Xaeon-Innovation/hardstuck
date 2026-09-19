"use client";

import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { AvatarPicker } from "@/components/avatar-picker";
import { TrustProfilePanel } from "@/components/trust-profile-panel";
import { authClient } from "@/lib/auth-client";

export default function AccountPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user as
    | { name?: string; email?: string; image?: string | null; role?: string }
    | undefined;

  if (!isPending && !user) {
    router.push("/login");
  }

  return (
    <SiteShell>
      <p className="hs-page-kicker">Account</p>
      <h1 className="hs-page-title">Profile</h1>
      <p className="hs-page-lead">
        Avatar, Riot account details, and booster verification.
      </p>

      {isPending || !user ? (
        <p className="mt-8 text-hs-mute">Loading…</p>
      ) : (
        <div className="mt-8 space-y-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="h-16 w-16 rounded-full border border-hs-signal/40 object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-hs-signal/50 bg-hs-signal/15 font-display text-2xl text-hs-signal">
                  {(user.name ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div>
                <div className="font-display text-lg text-hs-chalk">
                  {user.name}
                </div>
                <div className="text-sm text-hs-mute">{user.email}</div>
                <div className="text-[10px] uppercase tracking-wider text-hs-mute">
                  {user.role ?? "client"}
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-hs-signal">
                Avatar
              </h2>
              <AvatarPicker
                currentSrc={user.image}
                onPicked={() => {
                  void authClient.getSession();
                }}
              />
            </div>
          </div>

          <TrustProfilePanel role={user.role} />
        </div>
      )}
    </SiteShell>
  );
}
