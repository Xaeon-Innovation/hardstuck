"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GameSlug } from "@hardstuck/shared";
import { gameHeroSrc } from "@/lib/assets";

export type PageSlide = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  game: GameSlug;
};

const DEFAULT_SLIDES: PageSlide[] = [
  {
    id: "boost",
    kicker: "Calculator",
    title: "Quote & checkout",
    body: "Pick game, ranks, and extras. Price locks to the ledger before you pay into escrow.",
    href: "/boost",
    cta: "Open calculator",
    game: "lol",
  },
  {
    id: "notifications",
    kicker: "Orders",
    title: "Pay, chat, track",
    body: "Gamers pay here, chat with their booster, and manage solo vault deposits — no separate ticket page.",
    href: "/notifications",
    cta: "View orders",
    game: "valorant",
  },
  {
    id: "booster",
    kicker: "Work queue",
    title: "Offers & live chat",
    body: "Accept timed pool offers, run the boost, and talk to gamers — all from one live feed.",
    href: "/notifications",
    cta: "Open orders",
    game: "overwatch",
  },
  {
    id: "accounts",
    kicker: "Accounts",
    title: "Escrow marketplace",
    body: "Browse verified listings. Platform holds funds until transfer confirms.",
    href: "/accounts",
    cta: "Browse accounts",
    game: "apex",
  },
  {
    id: "register",
    kicker: "Join",
    title: "Closed beta",
    body: "Apply as a gamer or invite-only booster. Rank proof and ID checks for the pool.",
    href: "/register",
    cta: "Apply now",
    game: "marvel_rivals",
  },
];

type Props = {
  slides?: PageSlide[];
  autoMs?: number;
};

export function PageSlideshow({
  slides = DEFAULT_SLIDES,
  autoMs = 6500,
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const slide = slides[index]!;

  const go = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setInterval(() => go(index + 1), autoMs);
    return () => window.clearInterval(id);
  }, [paused, index, go, autoMs, count]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  return (
    <div
      className="relative px-12 sm:px-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <section
        className="hs-page-slideshow relative overflow-hidden border border-hs-line bg-hs-panel/40"
        aria-roledescription="carousel"
        aria-label="Platform pages"
      >
        <div className="pointer-events-none absolute inset-0">
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={slide.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gameHeroSrc(slide.game)}
                alt=""
                className="h-full w-full object-cover opacity-35"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-hs-ink via-hs-ink/88 to-hs-ink/55" />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative z-10 grid min-h-[min(420px,72svh)] lg:grid-cols-[1fr_auto] lg:items-stretch">
          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="text-[10px] uppercase tracking-[0.35em] text-hs-signal">
                  {slide.kicker}
                </p>
                <h2 className="mt-2 font-display text-3xl uppercase leading-tight text-hs-chalk sm:text-4xl">
                  {slide.title}
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-hs-mute sm:text-base">
                  {slide.body}
                </p>
                <Link
                  href={slide.href}
                  className="hs-btn-primary mt-8 inline-flex"
                >
                  {slide.cta}
                </Link>
              </motion.div>
            </AnimatePresence>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <div className="flex gap-1.5" role="tablist" aria-label="Slides">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`${s.kicker}: ${s.title}`}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 transition-all ${
                      i === index
                        ? "w-10 bg-hs-signal"
                        : "w-3 bg-hs-line hover:bg-hs-steel"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] uppercase tracking-widest text-hs-mute">
                {index + 1} / {count}
                {paused ? " · paused" : ""}
              </span>
            </div>
          </div>

          <div className="hidden border-l border-hs-line/80 bg-hs-ink/30 lg:flex lg:flex-col lg:justify-center lg:gap-1 lg:p-4">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                className={`border px-4 py-3 text-left text-xs uppercase tracking-wider transition-colors ${
                  i === index
                    ? "border-hs-signal/50 bg-hs-signal/10 text-hs-signal"
                    : "border-transparent text-hs-mute hover:border-hs-line hover:text-hs-chalk"
                }`}
              >
                {s.kicker}
              </button>
            ))}
          </div>
        </div>
      </section>

      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(index - 1)}
            className="hs-page-slideshow-nav absolute left-0 top-1/2 z-20 -translate-y-1/2"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(index + 1)}
            className="hs-page-slideshow-nav absolute right-0 top-1/2 z-20 -translate-y-1/2"
          >
            ›
          </button>
        </>
      ) : null}
    </div>
  );
}
