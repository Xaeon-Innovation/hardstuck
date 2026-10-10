"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { gameHeroSrc } from "@/lib/assets";
import type { GameSlug } from "@hardstuck/shared";
import {
  IconAccount,
  IconClimb,
  IconFarm,
  IconLevelUp,
} from "@/components/icons";
import { PageSlideshow } from "@/components/page-slideshow";

const HEROES = [
  { game: "lol" as const, label: "League of Legends" },
  { game: "valorant" as const, label: "Valorant" },
  { game: "overwatch" as const, label: "Overwatch 2" },
  { game: "marvel_rivals" as const, label: "Marvel Rivals" },
  { game: "apex" as const, label: "Apex Legends" },
] as const;

const GAMES = [
  { game: "lol" as GameSlug, name: "League of Legends", short: "LoL" },
  { game: "valorant" as GameSlug, name: "Valorant", short: "VAL" },
  { game: "overwatch" as GameSlug, name: "Overwatch 2", short: "OW2" },
  { game: "marvel_rivals" as GameSlug, name: "Marvel Rivals", short: "MR" },
  { game: "apex" as GameSlug, name: "Apex Legends", short: "Apex" },
] as const;

const OFFERS = [
  {
    title: "Rank climb",
    body: "Solo or Duo. Matched-pool assignment to a verified contractor.",
    href: "/boost",
    Icon: IconClimb,
  },
  {
    title: "Specialty farms",
    body: "Lord mastery, weapon skins, badges. Priced by the grind, not vibes.",
    href: "/boost?sku=farm",
    Icon: IconFarm,
  },
  {
    title: "Level-ups",
    body: "Account XP and ranked unlocks without the empty hours.",
    href: "/boost?sku=level",
    Icon: IconLevelUp,
  },
  {
    title: "Accounts",
    body: "Escrowed listings. Platform holds until transfer confirms.",
    href: "/marketplace?category=account",
    Icon: IconAccount,
  },
] as const;

const BOOST_STEPS = [
  {
    n: "01",
    title: "Quote",
    body: "Pick game, SKU, and extras. Price locks to the ledger in USD.",
  },
  {
    n: "02",
    title: "Pay",
    body: "Checkout settles escrow. Work starts only after funds clear.",
  },
  {
    n: "03",
    title: "Match",
    body: "Invite-only boosters get timed offers from a scored pool.",
  },
] as const;

const ACCOUNT_STEPS = [
  {
    n: "01",
    title: "Buy",
    body: "Browse verified listings. Pay into platform escrow.",
  },
  {
    n: "02",
    title: "Transfer",
    body: "Seller delivers credentials through the vault.",
  },
  {
    n: "03",
    title: "Release",
    body: "You confirm access, then the seller payout releases.",
  },
] as const;

export default function HomePage() {
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setHeroIdx((i) => (i + 1) % HEROES.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, []);

  const hero = HEROES[heroIdx]!;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden sm:justify-center">
          <div className="pointer-events-none absolute inset-0 z-0">
            <AnimatePresence mode="sync" initial={false}>
              <motion.img
                key={hero.game}
                src={gameHeroSrc(hero.game)}
                alt=""
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-hs-ink via-hs-ink/70 to-hs-ink/25" />
            <div className="absolute inset-0 bg-gradient-to-r from-hs-ink/85 via-hs-ink/45 to-transparent" />
            <div
              className="absolute inset-0 opacity-[0.1]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-24 sm:pb-24 sm:pt-16">
            <motion.p
              key={`label-${hero.game}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-3 text-[10px] uppercase tracking-[0.35em] text-hs-mute"
            >
              {hero.label}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-5xl uppercase leading-none tracking-wide text-hs-chalk sm:text-7xl md:text-8xl"
            >
              HARDSTUCK
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                delay: 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-5 max-w-xl font-display text-2xl uppercase leading-tight text-hs-signal sm:text-3xl"
            >
              Stuck in elo. Get unstuck.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.16,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-4 max-w-md text-base text-hs-mute sm:text-lg"
            >
              Rank climbs, specialty farms, level-ups, and escrowed accounts.
              Verified contractors, ledger escrow, risk disclosed up front.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.24,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link href="/boost" className="hs-btn-primary">
                Open calculator
              </Link>
              <Link href="/accounts" className="hs-btn-ghost">
                Browse accounts
              </Link>
            </motion.div>

            <div className="mt-10 flex gap-1.5" aria-hidden>
              {HEROES.map((h, i) => (
                <button
                  key={h.game}
                  type="button"
                  onClick={() => setHeroIdx(i)}
                  className={`h-1 transition-all ${
                    i === heroIdx
                      ? "w-8 bg-hs-signal"
                      : "w-3 bg-hs-line hover:bg-hs-steel"
                  }`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-hs-line bg-hs-ink">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
            <p className="hs-page-kicker">Tour</p>
            <h2 className="hs-page-title">Pages at a glance</h2>
            <p className="hs-page-lead">
              Swipe through the main areas — calculator, notifications desk,
              accounts, and signup.
            </p>
            <div className="mt-8">
              <PageSlideshow />
            </div>
          </div>
        </section>

        <section className="border-t border-hs-line bg-hs-panel/30">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
            <p className="hs-page-kicker">Games</p>
            <h2 className="hs-page-title">Five titles. One pool.</h2>
            <p className="hs-page-lead">
              Jump straight into a calculator or the account shelf.
            </p>
            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {GAMES.map((g, i) => (
                <motion.li
                  key={g.game}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Link
                    href={`/boost?game=${g.game}`}
                    className="group relative block h-36 overflow-hidden border border-hs-line transition-colors hover:border-hs-signal/50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gameHeroSrc(g.game)}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-500 group-hover:scale-105 group-hover:opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-hs-ink via-hs-ink/70 to-hs-ink/20" />
                    <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-4">
                      <span className="font-display text-xs uppercase tracking-[0.25em] text-hs-signal">
                        {g.short}
                      </span>
                      <span className="mt-1 block font-display text-base uppercase leading-tight text-hs-chalk group-hover:text-hs-signal">
                        {g.name}
                      </span>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-hs-line bg-hs-ink">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
            <p className="hs-page-kicker">What we sell</p>
            <h2 className="hs-page-title">Climb. Farm. Level. Buy.</h2>
            <p className="hs-page-lead">
              Matched-pool fulfillment for services. Escrow marketplace for
              accounts.
            </p>
            <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {OFFERS.map((o, i) => (
                <motion.li
                  key={o.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                >
                  <Link href={o.href} className="group block">
                    <span className="mb-4 flex h-11 w-11 items-center justify-center border border-hs-signal/40 bg-hs-signal/10 text-hs-signal transition-colors group-hover:border-hs-signal group-hover:bg-hs-signal/20">
                      <o.Icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-display text-xl uppercase text-hs-chalk group-hover:text-hs-signal">
                      {o.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-hs-mute">
                      {o.body}
                    </p>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-hs-line bg-hs-ink">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
            <p className="hs-page-kicker">How it runs</p>
            <h2 className="hs-page-title">Two paths. One ledger.</h2>
            <div className="mt-12 grid gap-14 lg:grid-cols-2">
              <div>
                <p className="font-display text-sm uppercase tracking-widest text-hs-signal">
                  Boosts &amp; farms
                </p>
                <ol className="mt-6 grid gap-8 sm:grid-cols-3 lg:grid-cols-1">
                  {BOOST_STEPS.map((step) => (
                    <li key={step.n}>
                      <span className="font-display text-sm text-hs-signal">
                        {step.n}
                      </span>
                      <h3 className="mt-1 font-display text-lg uppercase text-hs-chalk">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm text-hs-mute">{step.body}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="font-display text-sm uppercase tracking-widest text-hs-signal">
                  Accounts
                </p>
                <ol className="mt-6 grid gap-8 sm:grid-cols-3 lg:grid-cols-1">
                  {ACCOUNT_STEPS.map((step) => (
                    <li key={step.n}>
                      <span className="font-display text-sm text-hs-signal">
                        {step.n}
                      </span>
                      <h3 className="mt-1 font-display text-lg uppercase text-hs-chalk">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm text-hs-mute">{step.body}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-hs-line bg-hs-panel/20">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
            <p className="hs-page-kicker">For contractors</p>
            <h2 className="hs-page-title">Apply to the pool.</h2>
            <p className="hs-page-lead max-w-xl">
              Invite-only boosters and sellers. You keep 75% on boosts and 80%
              on account sales after release. ID-checked, scored assignment,
              Payoneer or Wise payouts. Gray-market risk is yours to accept.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="hs-btn-primary">
                Apply for closed beta
              </Link>
              <Link href="/notifications" className="hs-btn-ghost">
                Booster queue
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
