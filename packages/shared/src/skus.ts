import type { GameSlug, ServiceType, SkuKind } from "./enums";
import type { RankNode } from "./catalog";
import { getCatalog, rankIndex } from "./catalog";

export type SkuDelivery = ServiceType | "either";

export type RankClimbSku = {
  kind: "rank_climb";
  slug: string;
  game: GameSlug;
  label: string;
  description: string;
  delivery: SkuDelivery;
  /** Optional role key for OW (tank/damage/support/open) */
  roleKey?: string;
};

export type UnitFarmSku = {
  kind: "unit_farm";
  slug: string;
  game: GameSlug;
  label: string;
  description: string;
  delivery: SkuDelivery;
  /** USD cents per unit (hero / weapon unlock) */
  unitUsdCents: number;
  units: { key: string; label: string; multiplier?: number }[];
};

export type ProgressBandSku = {
  kind: "progress_band";
  slug: string;
  game: GameSlug;
  label: string;
  description: string;
  delivery: SkuDelivery;
  /** USD cents per level step */
  centsPerLevel: number;
  minLevel: number;
  maxLevel: number;
};

export type FixedPackageSku = {
  kind: "fixed_package";
  slug: string;
  game: GameSlug;
  label: string;
  description: string;
  delivery: SkuDelivery;
  amountUsdCents: number;
};

export type SkuDefinition =
  | RankClimbSku
  | UnitFarmSku
  | ProgressBandSku
  | FixedPackageSku;

function owRoleClimb(role: string, label: string): RankClimbSku {
  return {
    kind: "rank_climb",
    slug: `overwatch_rank_${role}`,
    game: "overwatch",
    label: `OW2 Rank - ${label}`,
    description: `Competitive climb for ${label} queue.`,
    delivery: "either",
    roleKey: role,
  };
}

export const SKUS: SkuDefinition[] = [
  // Rank climbs
  {
    kind: "rank_climb",
    slug: "lol_rank",
    game: "lol",
    label: "LoL Rank Climb",
    description: "Solo/Duo ranked climb.",
    delivery: "either",
  },
  {
    kind: "rank_climb",
    slug: "valorant_rank",
    game: "valorant",
    label: "Valorant Rank Climb",
    description: "Competitive climb.",
    delivery: "either",
  },
  owRoleClimb("tank", "Tank"),
  owRoleClimb("damage", "Damage"),
  owRoleClimb("support", "Support"),
  owRoleClimb("open", "Open Queue"),
  {
    kind: "rank_climb",
    slug: "marvel_rivals_rank",
    game: "marvel_rivals",
    label: "Marvel Rivals Rank",
    description: "Competitive climb.",
    delivery: "either",
  },
  {
    kind: "rank_climb",
    slug: "apex_rank",
    game: "apex",
    label: "Apex Rank Climb",
    description: "Rookie through Master.",
    delivery: "either",
  },

  // Specialty farms
  {
    kind: "unit_farm",
    slug: "marvel_lord",
    game: "marvel_rivals",
    label: "Lord Farm",
    description: "Agent → Lord proficiency on one hero.",
    delivery: "solo",
    unitUsdCents: 7900, // ~$79 Agent→Lord pack mid undercut
    units: [
      { key: "vanguard", label: "Vanguard", multiplier: 1.15 },
      { key: "duelist", label: "Duelist", multiplier: 1 },
      { key: "strategist", label: "Strategist", multiplier: 1.05 },
      { key: "any", label: "Any hero", multiplier: 1 },
    ],
  },
  {
    kind: "unit_farm",
    slug: "overwatch_weapon_cp",
    game: "overwatch",
    label: "Weapon Skin (3k CP)",
    description: "Farm ~3000 Competitive Points for one weapon variant.",
    delivery: "solo",
    unitUsdCents: 25500, // ~$255 vs ~$297 mid-market
    units: [
      { key: "gold", label: "Gold weapon", multiplier: 1 },
      { key: "jade", label: "Jade weapon", multiplier: 1 },
      { key: "galactic", label: "Galactic weapon", multiplier: 1.05 },
    ],
  },
  {
    kind: "unit_farm",
    slug: "apex_badge",
    game: "apex",
    label: "Badge Farm",
    description: "4K damage or 20-kill badge on a legend.",
    delivery: "solo",
    unitUsdCents: 4500,
    units: [
      { key: "4k", label: "4K Damage", multiplier: 1 },
      { key: "20kill", label: "20 Kill", multiplier: 1.35 },
    ],
  },

  // Level / progress
  {
    kind: "progress_band",
    slug: "apex_level",
    game: "apex",
    label: "Apex Level Boost",
    description: "Account level progression.",
    delivery: "solo",
    centsPerLevel: 45, // ~$9 for 20 levels
    minLevel: 1,
    maxLevel: 500,
  },
  {
    kind: "progress_band",
    slug: "marvel_level",
    game: "marvel_rivals",
    label: "Marvel Account Level",
    description: "Account XP grind.",
    delivery: "solo",
    centsPerLevel: 55,
    minLevel: 1,
    maxLevel: 100,
  },
  {
    kind: "progress_band",
    slug: "overwatch_bp",
    game: "overwatch",
    label: "Battle Pass Tiers",
    description: "OW2 battle pass tier leveling.",
    delivery: "solo",
    centsPerLevel: 95,
    minLevel: 1,
    maxLevel: 80,
  },

  // Fixed packages
  {
    kind: "fixed_package",
    slug: "apex_ranked_unlock",
    game: "apex",
    label: "Road to Ranked Unlock",
    description: "Level 20 + Road to Ranked challenges.",
    delivery: "solo",
    amountUsdCents: 4200, // ~$42 under mid ~$50–80
  },
  {
    kind: "fixed_package",
    slug: "overwatch_comp_unlock",
    game: "overwatch",
    label: "Competitive Unlock",
    description: "Quick Play wins required to open ranked.",
    delivery: "solo",
    amountUsdCents: 1800,
  },
];

export function getSku(slug: string): SkuDefinition | undefined {
  return SKUS.find((s) => s.slug === slug);
}

export function skusForGame(game: GameSlug): SkuDefinition[] {
  return SKUS.filter((s) => s.game === game);
}

export function skusByKind(kind: SkuKind): SkuDefinition[] {
  return SKUS.filter((s) => s.kind === kind);
}

export function defaultRankClimbSku(game: GameSlug): RankClimbSku {
  const found = SKUS.find(
    (s): s is RankClimbSku => s.kind === "rank_climb" && s.game === game,
  );
  if (!found) throw new Error(`No rank climb SKU for ${game}`);
  return found;
}

/** Re-export RankNode for SKU consumers */
export type { RankNode };
export { getCatalog, rankIndex };
