import type { GameSlug } from "@hardstuck/shared";
import { CATALOGS } from "@hardstuck/shared";

const LOL_TIER_FILE: Record<string, string> = {
  iron: "iron.png",
  bronze: "bronze.png",
  silver: "silver.png",
  gold: "gold.png",
  platinum: "platinum.png",
  emerald: "emerald.png",
  diamond: "diamond.png",
  master: "master.png",
  grandmaster: "grandmaster.png",
  challenger: "challenger.png",
};

/** Official OW competitive badges from Overwatch Wiki (CC BY-NC-SA) */
const OW_TIER_FILE: Record<string, string> = {
  bronze: "bronze.webp",
  silver: "silver.webp",
  gold: "gold.webp",
  platinum: "platinum.webp",
  diamond: "diamond.webp",
  master: "master.webp",
  grandmaster: "grandmaster.webp",
  champion: "champion.webp",
};

/** Marvel Rivals rank logos from rivalskins.com/assets/rank-logos */
const MR_TIER_FILE: Record<string, string> = {
  bronze: "bronze.webp",
  silver: "silver.webp",
  gold: "gold.webp",
  platinum: "platinum.webp",
  diamond: "diamond.webp",
  grandmaster: "grandmaster.webp",
  celestial: "celestial.webp",
  eternity: "eternity.webp",
  one_above_all: "one_above_all.webp",
};

/**
 * Apex ranked tier icons from Apex Legends Wiki Category:Ranked_tier_icons.
 * Division (I-IV) is rendered in the crest UI over the lower-middle of the badge.
 */
const APEX_TIER_FILE: Record<string, string> = {
  rookie: "bronze.webp",
  bronze: "bronze.webp",
  silver: "silver.webp",
  gold: "gold.webp",
  platinum: "platinum.webp",
  diamond: "diamond.webp",
  master: "master.webp",
  predator: "predator.webp",
};

const APEX_DIVISION_LABEL: Record<string, string> = {
  iv: "IV",
  iii: "III",
  ii: "II",
  i: "I",
};

/** Map catalog rank key to local public asset path */
export function rankIconSrc(game: GameSlug, rankKey: string): string {
  if (game === "lol") {
    const tier = rankKey.split("_")[0] ?? rankKey;
    const file = LOL_TIER_FILE[tier] ?? "iron.png";
    return `/ranks/lol/${file}`;
  }
  if (game === "valorant") {
    return `/ranks/valorant/${rankKey}.png`;
  }
  if (game === "overwatch") {
    const tier = rankKey.split("_")[0] ?? rankKey;
    const file = OW_TIER_FILE[tier] ?? "bronze.webp";
    return `/ranks/overwatch/${file}`;
  }
  if (game === "marvel_rivals") {
    if (rankKey === "eternity" || rankKey === "one_above_all") {
      return `/ranks/marvel_rivals/${MR_TIER_FILE[rankKey]}`;
    }
    const tier = rankKey.split("_")[0] ?? rankKey;
    const file = MR_TIER_FILE[tier] ?? "bronze.webp";
    return `/ranks/marvel_rivals/${file}`;
  }
  if (game === "apex") {
    if (rankKey === "master" || rankKey === "predator") {
      return `/ranks/apex/${APEX_TIER_FILE[rankKey]}`;
    }
    const tier = rankKey.split("_")[0] ?? rankKey;
    const file = APEX_TIER_FILE[tier] ?? "bronze.webp";
    return `/ranks/apex/${file}`;
  }
  return `/ranks/placeholder.svg`;
}

/** Apex division numeral for overlay (lower middle of badge). */
export function apexDivisionLabel(rankKey: string): string | null {
  if (rankKey === "master" || rankKey === "predator") return null;
  const div = rankKey.split("_")[1];
  if (!div) return null;
  return APEX_DIVISION_LABEL[div] ?? null;
}

export function gameHeroSrc(game: GameSlug): string {
  switch (game) {
    case "lol":
      return "/games/league.jpg";
    case "valorant":
      return "/games/valorant.jpg";
    case "overwatch":
      return "/games/overwatch.avif";
    case "marvel_rivals":
      return "/games/marvel2.jpg";
    case "apex":
      return "/games/apex.jpg";
    default:
      return "/games/league.jpg";
  }
}

export function gameLabel(game: GameSlug): string {
  return CATALOGS[game]?.name ?? game;
}
