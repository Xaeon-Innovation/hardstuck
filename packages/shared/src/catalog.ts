import type { GameSlug } from "./enums";

export type RankNode = {
  key: string;
  label: string;
  /** Relative climb difficulty; used to scale step cost */
  weight: number;
};

export type GameCatalog = {
  slug: GameSlug;
  name: string;
  shortName: string;
  servers: { key: string; label: string }[];
  queues: { key: string; label: string }[];
  ranks: RankNode[];
  /** USD cents to climb one step *from* this rank toward the next */
  baseStepUsdCents: number;
};

export const ADD_ONS = [
  {
    key: "priority",
    label: "Priority queue",
    description: "Jump the matched-pool line when supply is tight.",
    percent: 25,
  },
  {
    key: "stream",
    label: "Stream games",
    description: "Booster streams the climb (Solo only).",
    percent: 15,
    soloOnly: true,
  },
  {
    key: "solo_only",
    label: "Solo queue only",
    description: "No Flex / party queue (LoL).",
    percent: 20,
    game: "lol" as GameSlug,
  },
  {
    key: "voice",
    label: "Voice chat",
    description: "Live call during Duo sessions.",
    percent: 20,
    duoOnly: true,
  },
] as const;

export type AddOnKey = (typeof ADD_ONS)[number]["key"];

const LOL_DIVISION_WEIGHTS: Record<string, number> = {
  iron: 1,
  bronze: 1.15,
  silver: 1.35,
  gold: 1.65,
  platinum: 2.1,
  emerald: 2.7,
  diamond: 3.6,
};

function lolDivisions(tier: keyof typeof LOL_DIVISION_WEIGHTS): RankNode[] {
  const labels = ["IV", "III", "II", "I"] as const;
  const w = LOL_DIVISION_WEIGHTS[tier];
  return labels.map((div, i) => ({
    key: `${tier}_${div.toLowerCase()}`,
    label: `${tier[0]!.toUpperCase()}${tier.slice(1)} ${div}`,
    weight: w * (1 + i * 0.08),
  }));
}

export const LOL_CATALOG: GameCatalog = {
  slug: "lol",
  name: "League of Legends",
  shortName: "LoL",
  baseStepUsdCents: 900,
  servers: [
    { key: "euw", label: "EU West" },
    { key: "eune", label: "EU Nordic & East" },
    { key: "na", label: "North America" },
    { key: "kr", label: "Korea" },
    { key: "br", label: "Brazil" },
    { key: "lan", label: "LAN" },
    { key: "las", label: "LAS" },
    { key: "oce", label: "Oceania" },
    { key: "tr", label: "Turkey" },
    { key: "jp", label: "Japan" },
    { key: "me", label: "Middle East" },
  ],
  queues: [
    { key: "solo", label: "Ranked Solo/Duo" },
    { key: "flex", label: "Ranked Flex" },
  ],
  ranks: [
    ...lolDivisions("iron"),
    ...lolDivisions("bronze"),
    ...lolDivisions("silver"),
    ...lolDivisions("gold"),
    ...lolDivisions("platinum"),
    ...lolDivisions("emerald"),
    ...lolDivisions("diamond"),
    { key: "master", label: "Master", weight: 5.2 },
    { key: "grandmaster", label: "Grandmaster", weight: 7.5 },
    { key: "challenger", label: "Challenger", weight: 10 },
  ],
};

const VAL_TIER_WEIGHTS: Record<string, number> = {
  iron: 1,
  bronze: 1.12,
  silver: 1.3,
  gold: 1.55,
  platinum: 1.95,
  diamond: 2.5,
  ascendant: 3.2,
  immortal: 4.4,
};

function valDivisions(tier: keyof typeof VAL_TIER_WEIGHTS): RankNode[] {
  const w = VAL_TIER_WEIGHTS[tier];
  return [1, 2, 3].map((n) => ({
    key: `${tier}_${n}`,
    label: `${tier[0]!.toUpperCase()}${tier.slice(1)} ${n}`,
    weight: w * (1 + (n - 1) * 0.1),
  }));
}

export const VALORANT_CATALOG: GameCatalog = {
  slug: "valorant",
  name: "Valorant",
  shortName: "VAL",
  baseStepUsdCents: 1000,
  servers: [
    { key: "eu", label: "Europe" },
    { key: "na", label: "North America" },
    { key: "ap", label: "Asia Pacific" },
    { key: "kr", label: "Korea" },
    { key: "br", label: "Brazil" },
    { key: "latam", label: "LATAM" },
  ],
  queues: [{ key: "competitive", label: "Competitive" }],
  ranks: [
    ...valDivisions("iron"),
    ...valDivisions("bronze"),
    ...valDivisions("silver"),
    ...valDivisions("gold"),
    ...valDivisions("platinum"),
    ...valDivisions("diamond"),
    ...valDivisions("ascendant"),
    ...valDivisions("immortal"),
    { key: "radiant", label: "Radiant", weight: 9 },
  ],
};

/** OW2: 5 divisions per tier (5 lowest → 1 highest). Targets ~$26 Bronze5→Silver1. */
const OW_TIER_WEIGHTS: Record<string, number> = {
  bronze: 0.72,
  silver: 0.95,
  gold: 1.25,
  platinum: 1.7,
  diamond: 2.4,
  master: 3.4,
  grandmaster: 4.8,
  champion: 6.5,
};

function owDivisions(tier: keyof typeof OW_TIER_WEIGHTS): RankNode[] {
  const w = OW_TIER_WEIGHTS[tier];
  return [5, 4, 3, 2, 1].map((n, i) => ({
    key: `${tier}_${n}`,
    label: `${tier[0]!.toUpperCase()}${tier.slice(1)} ${n}`,
    weight: w * (1 + i * 0.06),
  }));
}

export const OVERWATCH_CATALOG: GameCatalog = {
  slug: "overwatch",
  name: "Overwatch 2",
  shortName: "OW2",
  baseStepUsdCents: 280,
  servers: [
    { key: "eu", label: "Europe" },
    { key: "na", label: "Americas" },
    { key: "asia", label: "Asia" },
  ],
  queues: [
    { key: "tank", label: "Tank" },
    { key: "damage", label: "Damage" },
    { key: "support", label: "Support" },
    { key: "open", label: "Open Queue" },
  ],
  ranks: [
    ...owDivisions("bronze"),
    ...owDivisions("silver"),
    ...owDivisions("gold"),
    ...owDivisions("platinum"),
    ...owDivisions("diamond"),
    ...owDivisions("master"),
    ...owDivisions("grandmaster"),
    ...owDivisions("champion"),
  ],
};

const MR_TIER_WEIGHTS: Record<string, number> = {
  bronze: 0.9,
  silver: 1.1,
  gold: 1.35,
  platinum: 1.7,
  diamond: 2.2,
  grandmaster: 3.0,
  celestial: 4.2,
  eternity: 6.0,
};

function mrDivisions(tier: keyof typeof MR_TIER_WEIGHTS): RankNode[] {
  const w = MR_TIER_WEIGHTS[tier];
  return [3, 2, 1].map((n, i) => ({
    key: `${tier}_${n}`,
    label: `${tier[0]!.toUpperCase()}${tier.slice(1)} ${n}`,
    weight: w * (1 + i * 0.08),
  }));
}

export const MARVEL_RIVALS_CATALOG: GameCatalog = {
  slug: "marvel_rivals",
  name: "Marvel Rivals",
  shortName: "MR",
  baseStepUsdCents: 850,
  servers: [
    { key: "pc", label: "PC" },
    { key: "console", label: "Console" },
  ],
  queues: [{ key: "competitive", label: "Competitive" }],
  ranks: [
    ...mrDivisions("bronze"),
    ...mrDivisions("silver"),
    ...mrDivisions("gold"),
    ...mrDivisions("platinum"),
    ...mrDivisions("diamond"),
    ...mrDivisions("grandmaster"),
    ...mrDivisions("celestial"),
    { key: "eternity", label: "Eternity", weight: 7.5 },
    { key: "one_above_all", label: "One Above All", weight: 10 },
  ],
};

const APEX_TIER_WEIGHTS: Record<string, number> = {
  rookie: 0.7,
  bronze: 0.9,
  silver: 1.15,
  gold: 1.5,
  platinum: 2.1,
  diamond: 3.2,
  master: 5.0,
};

function apexDivisions(tier: keyof typeof APEX_TIER_WEIGHTS): RankNode[] {
  const w = APEX_TIER_WEIGHTS[tier];
  return ["IV", "III", "II", "I"].map((div, i) => ({
    key: `${tier}_${div.toLowerCase()}`,
    label: `${tier[0]!.toUpperCase()}${tier.slice(1)} ${div}`,
    weight: w * (1 + i * 0.07),
  }));
}

export const APEX_CATALOG: GameCatalog = {
  slug: "apex",
  name: "Apex Legends",
  shortName: "Apex",
  baseStepUsdCents: 800,
  servers: [
    { key: "pc", label: "PC" },
    { key: "psn", label: "PlayStation" },
    { key: "xbox", label: "Xbox" },
  ],
  queues: [{ key: "ranked", label: "Ranked" }],
  ranks: [
    ...apexDivisions("rookie"),
    ...apexDivisions("bronze"),
    ...apexDivisions("silver"),
    ...apexDivisions("gold"),
    ...apexDivisions("platinum"),
    ...apexDivisions("diamond"),
    { key: "master", label: "Master", weight: 6.5 },
  ],
};

export const CATALOGS: Record<GameSlug, GameCatalog> = {
  lol: LOL_CATALOG,
  valorant: VALORANT_CATALOG,
  overwatch: OVERWATCH_CATALOG,
  marvel_rivals: MARVEL_RIVALS_CATALOG,
  apex: APEX_CATALOG,
};

export const LP_BANDS = [
  { key: "0_20", label: "0–20 LP", factor: 1.05 },
  { key: "21_40", label: "21–40 LP", factor: 1 },
  { key: "41_60", label: "41–60 LP", factor: 0.95 },
  { key: "61_80", label: "61–80 LP", factor: 0.9 },
  { key: "81_100", label: "81–100 LP", factor: 0.85 },
] as const;

export const LP_GAIN_BANDS = [
  { key: "30_plus", label: "30+ LP / win", factor: 0.9 },
  { key: "25_29", label: "25–29 LP / win", factor: 1 },
  { key: "20_24", label: "20–24 LP / win", factor: 1.1 },
  { key: "10_19", label: "10–19 LP / win", factor: 1.25 },
] as const;

export function getCatalog(game: GameSlug): GameCatalog {
  return CATALOGS[game];
}

export function rankIndex(game: GameSlug, rankKey: string): number {
  const idx = getCatalog(game).ranks.findIndex((r) => r.key === rankKey);
  if (idx < 0) throw new Error(`Unknown rank: ${rankKey}`);
  return idx;
}
