import type { GameSlug } from "@hardstuck/shared";

export type GameIdentityFields = {
  namePlaceholder: string;
  tagPlaceholder: string;
  /** Battletag / Riot tag required for lookup + save. */
  tagRequired: boolean;
  /** Show the tag input at all. */
  showTag: boolean;
  lookupHint: string;
};

/** Form labels / placeholders for linking a game identity. */
export function gameIdentityFields(game: GameSlug): GameIdentityFields {
  switch (game) {
    case "lol":
      return {
        namePlaceholder: "Riot name",
        tagPlaceholder: "Tag (e.g. 1478)",
        tagRequired: true,
        showTag: true,
        lookupHint: "Enter Riot ID (Name#Tag)",
      };
    case "valorant":
      return {
        namePlaceholder: "Riot name",
        tagPlaceholder: "Tag (e.g. 1478)",
        tagRequired: true,
        showTag: true,
        lookupHint: "Enter Riot ID (Name#Tag)",
      };
    case "overwatch":
      return {
        namePlaceholder: "Battletag",
        tagPlaceholder: "Disc # (e.g. 21482)",
        tagRequired: true,
        showTag: true,
        lookupHint: "Enter Battletag (Name#1234)",
      };
    case "apex":
      return {
        namePlaceholder: "EA / Origin username",
        tagPlaceholder: "EA UID (if name misses)",
        tagRequired: false,
        showTag: true,
        lookupHint:
          "Use your EA/Origin name (not Steam). If lookup misses, paste EA UID from Origin/EA app.",
      };
    case "marvel_rivals":
      return {
        namePlaceholder: "In-game name",
        tagPlaceholder: "Player UID (recommended)",
        tagRequired: false,
        showTag: true,
        lookupHint:
          "OP.GG needs your numeric Player UID (Career Overview or bottom-left). Name alone only works if you’re already indexed.",
      };
    default:
      return {
        namePlaceholder: "Name",
        tagPlaceholder: "Tag",
        tagRequired: true,
        showTag: true,
        lookupHint: "Enter name",
      };
  }
}

/**
 * Map calculator "server" to provider platform where they coincide.
 * Valorant: server is region (eu/na) — platform stays pc. Do not pass region as platform.
 * Overwatch: server is region; platform is pc/console (separate).
 * Apex/Marvel: server dropdown is the platform (pc/psn/xbox).
 */
export function platformFromServer(
  game: GameSlug,
  server?: string,
): string | undefined {
  if (game === "apex" || game === "marvel_rivals") {
    return server;
  }
  return undefined;
}
