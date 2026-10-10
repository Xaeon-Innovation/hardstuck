"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useBoosterLive } from "@/components/booster-live-provider";
import { canUseBoosterDesk } from "@/lib/roles";

function UserAvatar({
  name,
  email,
  image,
}: {
  name?: string;
  email?: string;
  image?: string | null;
}) {
  const label = name?.trim() || email?.trim() || "?";
  const initial = label.charAt(0).toUpperCase();

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={label}
        title={label}
        className="h-8 w-8 rounded-full border border-hs-signal/40 object-cover"
      />
    );
  }

  return (
    <span
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-hs-signal/50 bg-hs-signal/15 font-display text-sm text-hs-signal"
      aria-label={label}
    >
      {initial}
    </span>
  );
}

function NavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-hs-mute transition-colors hover:text-hs-chalk"
    >
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user as
    | { name?: string; email?: string; role?: string; image?: string | null }
    | undefined;
  const role = user?.role;
  const isBoosterUser = role === "booster";
  const signedIn = Boolean(session?.user);
  const live = useBoosterLive();
  const alertCount = canUseBoosterDesk(role) ? (live?.unreadCount ?? 0) : 0;
  const [open, setOpen] = useState(false);
  const [opsOpen, setOpsOpen] = useState(false);
  const opsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!opsRef.current?.contains(e.target as Node)) setOpsOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function signOut() {
    await authClient.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-hs-line/80 bg-hs-ink/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="group flex items-baseline gap-2" onClick={close}>
          <span className="font-display text-xl tracking-wide text-hs-chalk transition-colors group-hover:text-hs-signal">
            HARDSTUCK
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.25em] text-hs-mute sm:inline">
            matched pool
          </span>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-5 text-sm md:flex">
          <NavLink href="/boost">Calculator</NavLink>
          <NavLink href="/marketplace">Marketplace</NavLink>
          {signedIn ? (
            <Link
              href="/notifications"
              className="relative text-hs-mute transition-colors hover:text-hs-chalk"
            >
              Orders
              {alertCount > 0 ? (
                <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center bg-hs-signal px-1 text-[9px] font-bold text-hs-ink">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              ) : null}
            </Link>
          ) : null}
          {role === "admin" ? (
            <NavLink href="/booster">Booster</NavLink>
          ) : null}
          {role === "admin" ? (
            <div className="relative" ref={opsRef}>
              <button
                type="button"
                onClick={() => setOpsOpen((v) => !v)}
                className="text-hs-mute transition-colors hover:text-hs-chalk"
              >
                Ops ▾
              </button>
              {opsOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 min-w-[10rem] border border-hs-line bg-hs-panel py-1 shadow-xl">
                  {(
                    [
                      ["/admin", "Dashboard"],
                      ["/admin/orders", "Orders"],
                      ["/admin/tickets", "Tickets"],
                      ["/admin/access", "Access"],
                      ["/admin/games", "Games"],
                      ["/admin/trust", "Trust"],
                      ["/admin/payouts", "Payouts"],
                      ["/admin/accounts", "Accounts"],
                      ["/admin/metrics", "Metrics"],
                    ] as const
                  ).map(([href, label]) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpsOpen(false)}
                      className="block px-4 py-2 text-sm text-hs-mute hover:bg-hs-ink hover:text-hs-chalk"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {isPending ? (
            <span className="text-xs text-hs-mute/60">…</span>
          ) : signedIn ? (
            <>
              <Link href="/account" title="Profile" className="hover:opacity-90">
                <UserAvatar
                  name={user?.name}
                  email={user?.email}
                  image={user?.image}
                />
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="text-hs-mute transition-colors hover:text-hs-chalk"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink href="/login">Sign in</NavLink>
              <Link href="/register" className="hs-btn-join">
                Join
              </Link>
            </>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          className="border border-hs-line px-3 py-1.5 text-xs uppercase tracking-wider text-hs-mute md:hidden"
          aria-expanded={open}
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <nav className="flex flex-col gap-3 border-t border-hs-line px-5 py-4 text-sm md:hidden">
          <NavLink href="/boost" onClick={close}>
            Calculator
          </NavLink>
          <NavLink href="/marketplace" onClick={close}>
            Marketplace
          </NavLink>
          {role === "admin" ? (
            <NavLink href="/booster" onClick={close}>
              Booster
            </NavLink>
          ) : null}
          {signedIn ? (
            <NavLink href="/notifications" onClick={close}>
              Orders
              {alertCount > 0 ? ` (${alertCount})` : ""}
            </NavLink>
          ) : null}
          {role === "admin" ? (
            <>
              <NavLink href="/admin" onClick={close}>
                Admin dashboard
              </NavLink>
              <NavLink href="/admin/orders" onClick={close}>
                Admin orders
              </NavLink>
              <NavLink href="/admin/tickets" onClick={close}>
                Tickets
              </NavLink>
              <NavLink href="/admin/access" onClick={close}>
                Access
              </NavLink>
              <NavLink href="/admin/games" onClick={close}>
                Games
              </NavLink>
              <NavLink href="/admin/trust" onClick={close}>
                Trust
              </NavLink>
              <NavLink href="/admin/payouts" onClick={close}>
                Payouts
              </NavLink>
              <NavLink href="/admin/accounts" onClick={close}>
                Accounts
              </NavLink>
              <NavLink href="/admin/metrics" onClick={close}>
                Metrics
              </NavLink>
            </>
          ) : null}
          {signedIn ? (
            <>
              <NavLink href="/account" onClick={close}>
                Profile
              </NavLink>
              <button
                type="button"
                onClick={signOut}
                className="text-left text-hs-mute"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink href="/login" onClick={close}>
                Sign in
              </NavLink>
              <Link href="/register" onClick={close} className="hs-btn-join w-fit">
                Join
              </Link>
            </>
          )}
        </nav>
      ) : null}
    </header>
  );
}
