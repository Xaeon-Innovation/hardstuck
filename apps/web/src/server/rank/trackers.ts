import type { GameSlug } from "@hardstuck/shared";

function enc(s: string) {
  return encodeURIComponent(s);
}

/** Outbound tracker / graph links for a saved identity. */
export function trackerUrlsFor(
  game: GameSlug,
  name: string,
  tag: string,
  server?: string,
): { label: string; url: string }[] {
  const riotId = `${name}-${tag}`;
  const region = (server ?? "euw").toLowerCase();

  switch (game) {
    case "lol":
      return [
        {
          label: "League of Graphs",
          url: `https://www.leagueofgraphs.com/summoner/${region}/${enc(name)}-${enc(tag)}`,
        },
        {
          label: "OP.GG",
          url: `https://op.gg/lol/summoners/${region}/${enc(name)}-${enc(tag)}`,
        },
      ];
    case "valorant":
      return [
        {
          label: "Tracker.gg",
          url: `https://tracker.gg/valorant/profile/riot/${enc(name)}%23${enc(tag)}/overview`,
        },
        {
          label: "Henrik",
          url: `https://tracker.henrikdev.xyz/?name=${enc(name)}&tag=${enc(tag)}`,
        },
      ];
    case "overwatch":
      return [
        {
          label: "Overbuff",
          url: `https://www.overbuff.com/players/${enc(name)}-${enc(tag)}`,
        },
        {
          label: "Blizzard",
          url: `https://overwatch.blizzard.com/en-us/career/${enc(name)}-${enc(tag)}/`,
        },
      ];
    case "apex": {
      const platform =
        tag && /^(psn|ps4|playstation)$/i.test(tag)
          ? "psn"
          : tag && /^(xbox|x1)$/i.test(tag)
            ? "xbl"
            : "origin";
      return [
        {
          label: "Tracker.gg",
          url: `https://apex.tracker.gg/apex/profile/${platform}/${enc(name)}/overview`,
        },
      ];
    }
    case "marvel_rivals":
      return [
        {
          label: "OP.GG",
          url: `https://op.gg/marvel-rivals/profile/${enc(name)}`,
        },
        {
          label: "Tracker.gg",
          url: `https://tracker.gg/marvel-rivals/profile/ign/${enc(name)}/overview`,
        },
      ];
    default:
      return [];
  }
}
