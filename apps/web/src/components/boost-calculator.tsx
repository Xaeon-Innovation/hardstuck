"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NumberFlow from "@number-flow/react";
import { motion, AnimatePresence } from "motion/react";
import {
  ADD_ONS,
  CATALOGS,
  LP_BANDS,
  LP_GAIN_BANDS,
  GameSlugs,
  quotePrice,
  skusForGame,
  type AddOnKey,
  type DisplayCurrency,
  type GameSlug,
  type ServiceType,
  type SkuDefinition,
} from "@hardstuck/shared";
import { gameHeroSrc, gameLabel, rankIconSrc, apexDivisionLabel } from "@/lib/assets";
import {
  IconArrow,
  IconBolt,
  IconCam,
  IconDuo,
  IconMic,
  IconShield,
  IconSolo,
} from "@/components/icons";

const EUR_PER_USD = Number(process.env.NEXT_PUBLIC_EUR_PER_USD ?? "0.92");

const ADDON_ICON: Record<string, React.ReactNode> = {
  priority: <IconBolt className="h-4 w-4" />,
  stream: <IconCam className="h-4 w-4" />,
  solo_only: <IconShield className="h-4 w-4" />,
  voice: <IconMic className="h-4 w-4" />,
};

type SkuTab = "rank" | "farm" | "level" | "unlock";

function tabForSku(sku: SkuDefinition): SkuTab {
  switch (sku.kind) {
    case "rank_climb":
      return "rank";
    case "unit_farm":
      return "farm";
    case "progress_band":
      return "level";
    case "fixed_package":
      return "unlock";
  }
}

function RankCrest({
  game,
  rankKey,
  size = 28,
}: {
  game: GameSlug;
  rankKey: string;
  size?: number;
}) {
  const division =
    game === "apex" ? apexDivisionLabel(rankKey) : null;
  const fontSize = Math.max(8, Math.round(size * 0.28));

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={rankIconSrc(game, rankKey)}
        alt=""
        width={size}
        height={size}
        className="object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]"
        draggable={false}
      />
      {division ? (
        <span
          className="pointer-events-none absolute left-1/2 font-display font-bold leading-none text-hs-chalk"
          style={{
            bottom: size * 0.14,
            transform: "translateX(-50%)",
            fontSize,
            textShadow: "0 1px 2px rgba(0,0,0,0.9)",
          }}
        >
          {division}
        </span>
      ) : null}
    </span>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  layoutId,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  layoutId: string;
}) {
  return (
    <div className="inline-flex flex-wrap border border-hs-line bg-hs-ink/80 p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
              active ? "text-hs-ink" : "text-hs-mute hover:text-hs-chalk"
            }`}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 bg-hs-signal"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            ) : null}
            <span className="relative z-10 flex items-center gap-1.5">
              {opt.icon}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function GamePicker({
  value,
  onChange,
}: {
  value: GameSlug;
  onChange: (g: GameSlug) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {GameSlugs.map((g) => {
        const active = g === value;
        return (
          <button
            key={g}
            type="button"
            onClick={() => onChange(g)}
            className={`group relative h-24 overflow-hidden border text-left transition-all ${
              active
                ? "border-hs-signal shadow-[0_0_0_1px_rgba(232,163,23,0.35)]"
                : "border-hs-line hover:border-hs-steel"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gameHeroSrc(g)}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover transition duration-500 ${
                active
                  ? "scale-105 opacity-55"
                  : "opacity-35 group-hover:scale-105 group-hover:opacity-50"
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-hs-ink via-hs-ink/75 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-end p-2.5">
              <span className="font-display text-sm uppercase tracking-wide text-hs-chalk">
                {CATALOGS[g].shortName}
              </span>
              <span className="truncate text-[10px] text-hs-mute">
                {gameLabel(g)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function RankGrid({
  game,
  ranks,
  value,
  onChange,
  label,
}: {
  game: GameSlug;
  ranks: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  label: string;
}) {
  const selected = ranks.find((r) => r.key === value);
  return (
    <div className="hs-panel flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm uppercase tracking-widest text-hs-mute">
          {label}
        </h3>
        <div className="flex items-center gap-2 text-xs text-hs-signal">
          {selected ? (
            <RankCrest game={game} rankKey={selected.key} size={22} />
          ) : null}
          {selected?.label}
        </div>
      </div>
      <div className="hs-scroll grid max-h-[280px] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
        {ranks.map((rank) => {
          const active = rank.key === value;
          return (
            <motion.button
              key={rank.key}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(rank.key)}
              className={`flex items-center gap-2 border px-2 py-2 text-left text-xs transition-colors ${
                active
                  ? "border-hs-signal bg-hs-signal/15 text-hs-chalk"
                  : "border-hs-line bg-hs-ink/40 text-hs-mute hover:border-hs-steel hover:text-hs-chalk"
              }`}
            >
              <RankCrest game={game} rankKey={rank.key} size={26} />
              <span className="leading-tight">{rank.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function pickDefaultSku(game: GameSlug, tab: SkuTab): SkuDefinition {
  const list = skusForGame(game).filter((s) => tabForSku(s) === tab);
  return list[0] ?? skusForGame(game)[0]!;
}

function skuButtonLabel(sku: SkuDefinition): string {
  if (sku.kind === "rank_climb" && sku.roleKey) {
    const q = CATALOGS[sku.game].queues.find((x) => x.key === sku.roleKey);
    return q?.label ?? sku.label;
  }
  return sku.label;
}

function climbBenefits(serviceType: ServiceType): { label: string; body: string }[] {
  if (serviceType === "duo") {
    return [
      {
        label: "You stay in lobby",
        body: "Play with the contractor. You keep the account in your hands.",
      },
      {
        label: "Matched, not auctioned",
        body: "Invite-only pool. Timed offers, scored assignment.",
      },
      {
        label: "Risk named up front",
        body: "Publisher sanctions are possible. We never sell ban-proof.",
      },
    ];
  }
  return [
    {
      label: "You set the ranks",
      body: "Current to desired. Price recalculates on every change.",
    },
    {
      label: "Vaulted credentials",
      body: "Solo delivery uses encrypted vault handoff, not DMs.",
    },
    {
      label: "Escrow before work",
      body: "Funds clear first. Climb starts after payment settles.",
    },
  ];
}

function climbSteps(serviceType: ServiceType): { n: string; title: string; body: string }[] {
  if (serviceType === "duo") {
    return [
      {
        n: "01",
        title: "Configure",
        body: "Ranks, server, queue, extras. Live ticket locks the quote.",
      },
      {
        n: "02",
        title: "Pay escrow",
        body: "Checkout settles. Order enters the matched pool.",
      },
      {
        n: "03",
        title: "Group up",
        body: "Assigned contractor invites you. Roles stay locked each game.",
      },
      {
        n: "04",
        title: "Hit target",
        body: "Wins stack to the desired rank. You confirm completion.",
      },
    ];
  }
  return [
    {
      n: "01",
      title: "Configure",
      body: "Ranks, server, queue, extras. Live ticket locks the quote.",
    },
    {
      n: "02",
      title: "Pay escrow",
      body: "Checkout settles. Order enters the matched pool.",
    },
    {
      n: "03",
      title: "Vault handoff",
      body: "You store credentials. Contractor claims and starts the climb.",
    },
    {
      n: "04",
      title: "Hit target",
      body: "Proof and chat on the order. You confirm, then release holds.",
    },
  ];
}

export function BoostCalculator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const initialGame = (() => {
    const g = searchParams.get("game");
    return GameSlugs.includes(g as GameSlug) ? (g as GameSlug) : "lol";
  })();
  const initialTab = (() => {
    const s = searchParams.get("sku");
    if (s === "farm" || s === "level" || s === "unlock" || s === "rank")
      return s;
    return "rank";
  })();

  const [game, setGame] = useState<GameSlug>(initialGame);
  const [skuTab, setSkuTab] = useState<SkuTab>(initialTab);
  const [skuSlug, setSkuSlug] = useState(
    () => pickDefaultSku(initialGame, initialTab).slug,
  );
  const [serviceType, setServiceType] = useState<ServiceType>("solo");
  const catalog = CATALOGS[game];
  const [startRankKey, setStart] = useState(catalog.ranks[4]!.key);
  const [endRankKey, setEnd] = useState(catalog.ranks[8]!.key);
  const [server, setServer] = useState(catalog.servers[0]!.key);
  const [queue, setQueue] = useState(catalog.queues[0]!.key);
  const [currentLpBand, setLp] =
    useState<(typeof LP_BANDS)[number]["key"]>("21_40");
  const [lpGainBand, setGain] =
    useState<(typeof LP_GAIN_BANDS)[number]["key"]>("25_29");
  const [addOnKeys, setAddOns] = useState<AddOnKey[]>([]);
  const [displayCurrency, setCurrency] = useState<DisplayCurrency>("USD");
  const [unitKey, setUnitKey] = useState("any");
  const [startLevel, setStartLevel] = useState(1);
  const [endLevel, setEndLevel] = useState(21);

  const gameSkus = skusForGame(game);
  const tabSkus = gameSkus.filter((s) => tabForSku(s) === skuTab);
  const activeSku =
    gameSkus.find((s) => s.slug === skuSlug) ?? tabSkus[0] ?? gameSkus[0]!;

  useEffect(() => {
    const next = pickDefaultSku(game, skuTab);
    setSkuSlug(next.slug);
    if (next.kind === "rank_climb" && next.roleKey) {
      setQueue(next.roleKey);
    }
    if (next.delivery === "solo") setServiceType("solo");
    if (next.kind === "unit_farm") {
      setUnitKey(next.units[0]!.key);
    }
    if (next.kind === "progress_band") {
      setStartLevel(next.minLevel);
      setEndLevel(Math.min(next.minLevel + 20, next.maxLevel));
    }
  }, [game, skuTab]);

  function selectSku(slug: string) {
    const next = gameSkus.find((s) => s.slug === slug);
    if (!next) return;
    setSkuSlug(next.slug);
    if (next.kind === "rank_climb" && next.roleKey) {
      setQueue(next.roleKey);
    }
    if (next.delivery === "solo") setServiceType("solo");
    if (next.kind === "unit_farm") {
      setUnitKey(next.units[0]!.key);
    }
    if (next.kind === "progress_band") {
      setStartLevel(next.minLevel);
      setEndLevel(Math.min(next.minLevel + 20, next.maxLevel));
    }
  }

  function selectQueue(nextQueue: string) {
    setQueue(nextQueue);
    const match = gameSkus.find(
      (s) => s.kind === "rank_climb" && s.roleKey === nextQueue,
    );
    if (match) setSkuSlug(match.slug);
  }

  function switchGame(next: GameSlug) {
    const c = CATALOGS[next];
    setGame(next);
    setStart(c.ranks[4]!.key);
    setEnd(c.ranks[8]!.key);
    setServer(c.servers[0]!.key);
    setQueue(c.queues[0]!.key);
    setAddOns([]);
    setSkuTab("rank");
  }

  function toggleAddOn(key: AddOnKey) {
    setAddOns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const quote = useMemo(
    () =>
      quotePrice({
        game,
        serviceType,
        startRankKey,
        endRankKey,
        server,
        queue,
        currentLpBand,
        lpGainBand,
        addOnKeys,
        displayCurrency,
        eurPerUsd: EUR_PER_USD,
        skuSlug: activeSku.slug,
        skuPayload: {
          unitKey,
          startLevel,
          endLevel,
        },
      }),
    [
      game,
      serviceType,
      startRankKey,
      endRankKey,
      server,
      queue,
      currentLpBand,
      lpGainBand,
      addOnKeys,
      displayCurrency,
      activeSku.slug,
      unitKey,
      startLevel,
      endLevel,
    ],
  );

  const visibleAddOns = ADD_ONS.filter((a) => {
    if ("soloOnly" in a && a.soloOnly && serviceType !== "solo") return false;
    if ("duoOnly" in a && a.duoOnly && serviceType !== "duo") return false;
    if ("game" in a && a.game && a.game !== game) return false;
    return true;
  });

  const showLp = game === "lol" || game === "valorant";
  const showRanks = activeSku.kind === "rank_climb";
  const showFarm = activeSku.kind === "unit_farm";
  const showLevel = activeSku.kind === "progress_band";
  const displayCents = quote.ok ? quote.displayAmountCents : 0;
  const roleSkus = tabSkus.filter(
    (s): s is Extract<SkuDefinition, { kind: "rank_climb" }> =>
      s.kind === "rank_climb" && Boolean(s.roleKey),
  );
  const queueDrivenBySku = roleSkus.length > 0 && showRanks;
  const startRank = catalog.ranks.find((r) => r.key === startRankKey);
  const endRank = catalog.ranks.find((r) => r.key === endRankKey);
  const queueLabel =
    catalog.queues.find((q) => q.key === queue)?.label ?? queue;
  const serverLabel =
    catalog.servers.find((s) => s.key === server)?.label ?? server;
  const benefits = climbBenefits(serviceType);
  const steps = climbSteps(serviceType);

  const availableTabs: { value: SkuTab; label: string }[] = [
    { value: "rank", label: "Rank" },
    ...(gameSkus.some((s) => s.kind === "unit_farm")
      ? [{ value: "farm" as const, label: "Farms" }]
      : []),
    ...(gameSkus.some((s) => s.kind === "progress_band")
      ? [{ value: "level" as const, label: "Level" }]
      : []),
    ...(gameSkus.some((s) => s.kind === "fixed_package")
      ? [{ value: "unlock" as const, label: "Unlock" }]
      : []),
  ];

  function onCheckout() {
    if (!quote.ok) return;
    setSubmitError(null);
    startTransition(async () => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game,
          serviceType,
          startRankKey: quote.startRankKey,
          endRankKey: quote.endRankKey,
          server,
          queue,
          currentLpBand: showLp ? currentLpBand : undefined,
          lpGainBand: showLp ? lpGainBand : undefined,
          addOnKeys,
          displayCurrency,
          skuSlug: activeSku.slug,
          skuPayload: { unitKey, startLevel, endLevel },
          riskDisclosureAccepted: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Could not create order");
        if (res.status === 401) router.push("/login");
        return;
      }
      router.push(`/notifications?order=${data.orderId}`);
    });
  }

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <AnimatePresence mode="sync" initial={false}>
          <motion.img
            key={game}
            src={gameHeroSrc(game)}
            alt=""
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-hs-ink/88 via-hs-ink/82 to-hs-ink/92" />
        <div className="absolute inset-0 bg-gradient-to-r from-hs-ink/75 via-hs-ink/55 to-hs-ink/70" />
      </div>

      <div className="relative z-10">
        <p className="hs-page-kicker">Matched pool</p>
        <h1 className="hs-page-title">You set the climb.</h1>
        <p className="hs-page-lead">
          Pick game, ranks, and extras. Price updates live. A verified
          contractor gets the offer after checkout clears escrow. Risk is
          disclosed before you pay - never sold as ban-proof.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-5">
        <GamePicker value={game} onChange={switchGame} />

        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            layoutId="seg-sku-tab"
            value={skuTab}
            onChange={setSkuTab}
            options={availableTabs}
          />
        </div>

        {tabSkus.length > 1 ? (
          <div className="flex flex-col gap-2">
            {queueDrivenBySku ? (
              <p className="text-[10px] uppercase tracking-[0.2em] text-hs-mute">
                Queue / role
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {tabSkus.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => selectSku(s.slug)}
                  className={`border px-3 py-2 text-xs uppercase tracking-wider ${
                    s.slug === activeSku.slug
                      ? "border-hs-signal bg-hs-signal/10 text-hs-signal"
                      : "border-hs-line text-hs-mute hover:text-hs-chalk"
                  }`}
                >
                  {skuButtonLabel(s)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <p className="text-sm text-hs-mute">{activeSku.description}</p>

        {activeSku.delivery === "either" || activeSku.kind === "rank_climb" ? (
          <div className="flex flex-col gap-3">
            <Segmented
              layoutId="seg-service"
              value={serviceType}
              onChange={setServiceType}
              options={[
                {
                  value: "solo",
                  label: "Solo",
                  icon: <IconSolo className="h-3.5 w-3.5" />,
                },
                {
                  value: "duo",
                  label: "Duo",
                  icon: <IconDuo className="h-3.5 w-3.5" />,
                },
              ]}
            />
            {showRanks ? (
              <ul className="grid gap-2 sm:grid-cols-3">
                {benefits.map((b) => (
                  <li
                    key={b.label}
                    className="border border-hs-line/80 bg-hs-ink/40 px-3 py-2.5"
                  >
                    <p className="font-display text-[11px] uppercase tracking-wider text-hs-signal">
                      {b.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-hs-mute">
                      {b.body}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-xs uppercase tracking-wider text-hs-signal">
            Solo delivery required
          </p>
        )}

        {showRanks ? (
          <>
            <div className="flex flex-wrap items-center gap-3 border border-hs-line bg-hs-panel/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <RankCrest game={game} rankKey={startRankKey} size={32} />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-hs-mute">
                    Current
                  </p>
                  <p className="font-display text-sm uppercase text-hs-chalk">
                    {startRank?.label}
                  </p>
                </div>
              </div>
              <IconArrow className="h-4 w-4 text-hs-signal" />
              <div className="flex items-center gap-2">
                <RankCrest game={game} rankKey={endRankKey} size={32} />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-hs-mute">
                    Desired
                  </p>
                  <p className="font-display text-sm uppercase text-hs-chalk">
                    {endRank?.label}
                  </p>
                </div>
              </div>
              <p className="ml-auto text-xs text-hs-mute">
                {serverLabel}
                {queueDrivenBySku || catalog.queues.length > 1
                  ? ` · ${queueLabel}`
                  : null}{" "}
                · {serviceType}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <RankGrid
                game={game}
                label="Current"
                ranks={catalog.ranks}
                value={startRankKey}
                onChange={setStart}
              />
              <RankGrid
                game={game}
                label="Desired"
                ranks={catalog.ranks}
                value={endRankKey}
                onChange={setEnd}
              />
            </div>
            <div className="hs-panel grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["Server", server, setServer, catalog.servers] as const,
                  ...(queueDrivenBySku
                    ? []
                    : ([["Queue", queue, selectQueue, catalog.queues]] as const)),
                ]
              ).map(([label, val, set, opts]) => (
                <label
                  key={label}
                  className="flex flex-col gap-1.5 text-xs uppercase tracking-wider text-hs-mute"
                >
                  {label}
                  <select
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    className="border border-hs-line bg-hs-ink px-2 py-2 text-sm normal-case tracking-normal text-hs-chalk"
                  >
                    {opts.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              {showLp ? (
                <>
                  <label className="flex flex-col gap-1.5 text-xs uppercase tracking-wider text-hs-mute">
                    Current LP
                    <select
                      value={currentLpBand}
                      onChange={(e) =>
                        setLp(e.target.value as (typeof LP_BANDS)[number]["key"])
                      }
                      className="border border-hs-line bg-hs-ink px-2 py-2 text-sm normal-case tracking-normal text-hs-chalk"
                    >
                      {LP_BANDS.map((b) => (
                        <option key={b.key} value={b.key}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs uppercase tracking-wider text-hs-mute">
                    LP / win
                    <select
                      value={lpGainBand}
                      onChange={(e) =>
                        setGain(
                          e.target.value as (typeof LP_GAIN_BANDS)[number]["key"],
                        )
                      }
                      className="border border-hs-line bg-hs-ink px-2 py-2 text-sm normal-case tracking-normal text-hs-chalk"
                    >
                      {LP_GAIN_BANDS.map((b) => (
                        <option key={b.key} value={b.key}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
            </div>
          </>
        ) : null}

        {showFarm && activeSku.kind === "unit_farm" ? (
          <div className="hs-panel p-4">
            <h3 className="mb-3 font-display text-sm uppercase tracking-widest text-hs-mute">
              Select unit
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {activeSku.units.map((u) => (
                <button
                  key={u.key}
                  type="button"
                  onClick={() => setUnitKey(u.key)}
                  className={`border px-3 py-3 text-left text-sm ${
                    unitKey === u.key
                      ? "border-hs-signal bg-hs-signal/10 text-hs-chalk"
                      : "border-hs-line text-hs-mute hover:border-hs-steel"
                  }`}
                >
                  {u.label}
                  {u.multiplier && u.multiplier !== 1 ? (
                    <span className="ml-2 text-xs text-hs-signal">
                      ×{u.multiplier}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showLevel && activeSku.kind === "progress_band" ? (
          <div className="hs-panel grid gap-4 p-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs uppercase tracking-wider text-hs-mute">
              From level
              <input
                type="number"
                min={activeSku.minLevel}
                max={activeSku.maxLevel - 1}
                value={startLevel}
                onChange={(e) => setStartLevel(Number(e.target.value))}
                className="border border-hs-line bg-hs-ink px-2 py-2 text-sm text-hs-chalk"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs uppercase tracking-wider text-hs-mute">
              To level
              <input
                type="number"
                min={activeSku.minLevel + 1}
                max={activeSku.maxLevel}
                value={endLevel}
                onChange={(e) => setEndLevel(Number(e.target.value))}
                className="border border-hs-line bg-hs-ink px-2 py-2 text-sm text-hs-chalk"
              />
            </label>
          </div>
        ) : null}

        {activeSku.kind === "fixed_package" ? (
          <div className="hs-panel p-4">
            <p className="font-display text-lg uppercase text-hs-chalk">
              {activeSku.label}
            </p>
            <p className="mt-2 text-sm text-hs-mute">{activeSku.description}</p>
            <p className="mt-3 text-hs-signal">
              ${(activeSku.amountUsdCents / 100).toFixed(2)} base
            </p>
          </div>
        ) : null}

        {showRanks || showFarm ? (
          <div className="hs-panel p-4">
            <h3 className="mb-3 font-display text-sm uppercase tracking-widest text-hs-mute">
              Extras
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleAddOns.map((a) => {
                const on = addOnKeys.includes(a.key);
                return (
                  <motion.button
                    key={a.key}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleAddOn(a.key)}
                    className={`border px-3 py-3 text-left transition-colors ${
                      on
                        ? "border-hs-signal/60 bg-hs-signal/10"
                        : "border-hs-line hover:border-hs-steel"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm text-hs-chalk">
                        <span className="text-hs-signal">{ADDON_ICON[a.key]}</span>
                        {a.label}
                      </span>
                      <span className="text-xs text-hs-signal">
                        +{a.percent}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-hs-mute">{a.description}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ) : null}

        {showRanks ? (
          <div className="border border-hs-line/80 px-4 py-5">
            <p className="font-display text-xs uppercase tracking-[0.2em] text-hs-mute">
              How this climb works
            </p>
            <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <li key={step.n}>
                  <span className="font-display text-xs text-hs-signal">
                    {step.n}
                  </span>
                  <h3 className="mt-1 font-display text-sm uppercase text-hs-chalk">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-hs-mute">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <aside className="hs-panel hs-ticket sticky top-24 flex h-fit flex-col gap-4 p-5">
        <div className="relative z-10 flex items-center justify-between">
          <p className="flex items-center gap-2 font-display text-xs uppercase tracking-[0.2em] text-hs-mute">
            <span className="hs-live-dot" />
            Live ticket
          </p>
          <Segmented
            layoutId="seg-currency"
            value={displayCurrency}
            onChange={setCurrency}
            options={[
              { value: "USD", label: "USD" },
              { value: "EUR", label: "EUR" },
            ]}
          />
        </div>

        <div className="relative z-10">
          {showRanks ? (
            <div className="mb-3 border border-hs-line/80 bg-hs-ink/50 px-3 py-3">
              <div className="flex items-center justify-center gap-3">
                <RankCrest game={game} rankKey={startRankKey} size={40} />
                <IconArrow className="h-5 w-5 text-hs-signal" />
                <RankCrest game={game} rankKey={endRankKey} size={40} />
              </div>
              <p className="mt-2 text-center font-display text-xs uppercase tracking-wider text-hs-chalk">
                {startRank?.label} → {endRank?.label}
              </p>
              <p className="mt-0.5 text-center text-[11px] text-hs-mute">
                {serviceType} · {queueLabel} · {serverLabel}
              </p>
            </div>
          ) : (
            <p className="mb-3 font-display text-sm uppercase text-hs-signal">
              {activeSku.label}
            </p>
          )}
          <p className="text-xs uppercase tracking-wider text-hs-mute">Total</p>
          <div className="mt-1 flex items-baseline gap-1 font-display text-4xl text-hs-chalk">
            <span className="text-2xl text-hs-signal">
              {displayCurrency === "EUR" ? "€" : "$"}
            </span>
            <NumberFlow
              value={displayCents / 100}
              format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
            />
          </div>
          {quote.ok ? (
            <p className="mt-1 text-xs text-hs-mute">
              Settles ${(quote.amountUsdCents / 100).toFixed(2)} USD
              {quote.divisions > 0
                ? ` · ${quote.divisions} division${quote.divisions === 1 ? "" : "s"}`
                : null}
            </p>
          ) : null}
        </div>

        <AnimatePresence mode="wait">
          {quote.ok ? (
            <motion.ul
              key="ok"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative z-10 hs-scroll max-h-48 space-y-1.5 overflow-y-auto border-t border-hs-line pt-3 text-xs text-hs-mute"
            >
              {quote.lines.slice(0, 8).map((line) => (
                <li
                  key={line.key}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate">{line.label}</span>
                  <span className="shrink-0 tabular-nums text-hs-chalk">
                    ${(line.amountUsdCents / 100).toFixed(2)}
                  </span>
                </li>
              ))}
              {quote.lines.length > 8 ? (
                <li className="text-hs-mute">
                  +{quote.lines.length - 8} more steps in the climb
                </li>
              ) : null}
              {quote.addOnPercentTotal > 0 ? (
                <li className="pt-1 text-hs-signal">
                  Add-ons +{quote.addOnPercentTotal}%
                </li>
              ) : null}
            </motion.ul>
          ) : (
            <motion.p
              key="err"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative z-10 border-t border-hs-line pt-3 text-sm text-hs-danger"
            >
              {quote.error}
            </motion.p>
          )}
        </AnimatePresence>

        {submitError ? (
          <p className="relative z-10 text-sm text-hs-danger">{submitError}</p>
        ) : null}

        <button
          type="button"
          disabled={!quote.ok || pending}
          onClick={onCheckout}
          className="hs-btn-primary relative z-10 mt-1 w-full"
        >
          {pending ? "Creating order…" : "Continue to checkout"}
        </button>
        <p className="relative z-10 text-[11px] leading-relaxed text-hs-mute">
          Boosting can violate publisher Terms of Service and may risk account
          sanctions. You must be signed in to place an order.
        </p>
      </aside>
        </div>
      </div>
    </>
  );
}
