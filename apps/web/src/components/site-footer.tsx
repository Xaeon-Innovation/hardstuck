import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-hs-line/80 bg-hs-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-sm tracking-wide text-hs-chalk">
            HARDSTUCK
          </p>
          <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-hs-mute">
            Matched-pool boosting. Gray-market risk is real: accounts can be
            banned. You proceed knowing that.
          </p>
        </div>
        <nav className="flex flex-wrap gap-5 text-xs uppercase tracking-wider text-hs-mute">
          <Link href="/boost" className="hover:text-hs-chalk">
            Calculator
          </Link>
          <Link href="/marketplace" className="hover:text-hs-chalk">
            Marketplace
          </Link>
          <Link href="/help" className="hover:text-hs-chalk">
            Help
          </Link>
          <Link href="/login" className="hover:text-hs-chalk">
            Sign in
          </Link>
          <Link href="/register" className="hover:text-hs-chalk">
            Join beta
          </Link>
        </nav>
      </div>
    </footer>
  );
}
