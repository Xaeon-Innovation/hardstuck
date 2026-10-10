import type { GameSlug } from "@hardstuck/shared";
import { trackerUrlsFor } from "./trackers";
import type { RankLookupInput, RankLookupResult } from "./types";

function displayTagFor(input: RankLookupInput): string {
  const tag = (input.tag ?? "").trim();
  if (!tag) return "";
  // Apex/Marvel often store platform or a duplicate name in the tag slot.
  if (
    input.game === "apex" ||
    input.game === "marvel_rivals" ||
    input.game === "overwatch"
  ) {
    if (/^(pc|psn|ps4|xbox|x1|eu|na|asia|—|-)$/i.test(tag)) return "";
    if (tag.toLowerCase() === input.name.trim().toLowerCase()) return "";
  }
  if (input.game === "apex" && /^\d{6,}$/.test(tag)) return ""; // UID — not for display
  return tag;
}

function baseResult(
  input: RankLookupInput,
  partial: Partial<RankLookupResult> & {
    provider: string;
    ok: boolean;
    live: boolean;
  },
): RankLookupResult {
  const tag = displayTagFor(input);
  const trackerTag = (input.tag ?? "").trim() || tag || "0000";
  return {
    ok: partial.ok,
    live: partial.live,
    game: input.game,
    displayName: tag ? `${input.name}#${tag}` : input.name,
    rankLabel: partial.rankLabel ?? null,
    rankKeyHint: partial.rankKeyHint ?? null,
    lpOrRr: partial.lpOrRr ?? null,
    wins: partial.wins ?? null,
    losses: partial.losses ?? null,
    peakLabel: partial.peakLabel ?? null,
    topUnits: partial.topUnits ?? [],
    trackerUrls: trackerUrlsFor(
      input.game,
      input.name,
      trackerTag,
      input.server,
    ),
    provider: partial.provider,
    fetchedAt: new Date().toISOString(),
    error: partial.error,
    raw: partial.raw,
  };
}

function hintFromLabel(label: string | null): string | null {
  if (!label) return null;
  const cleaned = label.toLowerCase().replace(/\s+/g, "_");
  return cleaned || null;
}

const LOL_DIV_ROMAN: Record<string, string> = {
  "1": "I",
  "2": "II",
  "3": "III",
  "4": "IV",
};

/** OP.GG MCP returns a Python-style object dump, not JSON. */
function parseOpGgMcpText(text: string): {
  rankLabel: string | null;
  rankKeyHint: string | null;
  lp: number | null;
  wins: number | null;
  losses: number | null;
  topUnits: { name: string; games?: number; winRate?: number }[];
  raw: Record<string, unknown>;
} {
  const empty = {
    rankLabel: null,
    rankKeyHint: null,
    lp: null,
    wins: null,
    losses: null,
    topUnits: [] as { name: string; games?: number; winRate?: number }[],
    raw: { mcpTextPreview: text.slice(0, 500) },
  };

  // Prefer Solo/Duo: LeagueStat("SOLORANKED",TierInfo("GOLD",1,44,...),22,6,...)
  const solo =
    text.match(
      /LeagueStat\("SOLORANKED",TierInfo\(([^)]*)\),(\d+|null),(\d+|null)/,
    ) ??
    text.match(
      /LeagueStat\("FLEXRANKED",TierInfo\(([^)]*)\),(\d+|null),(\d+|null)/,
    );
  if (!solo) return empty;

  const tierArgs = solo[1] ?? "";
  // TierInfo args: "GOLD",1,44,null,"url",...
  const tierMatch = tierArgs.match(
    /^"([A-Z_]+)"\s*,\s*(\d+|null)\s*,\s*(\d+|null)/,
  );
  if (!tierMatch || tierMatch[1] === "null") {
    return { ...empty, raw: { queue: solo[0], tierArgs } };
  }

  const tier = tierMatch[1]!.toLowerCase();
  const divNum = tierMatch[2] === "null" ? null : tierMatch[2]!;
  const lp =
    tierMatch[3] === "null" || tierMatch[3] == null
      ? null
      : Number(tierMatch[3]);
  const roman = divNum ? LOL_DIV_ROMAN[divNum] ?? divNum : null;
  const rankLabel = roman
    ? `${tier[0]!.toUpperCase()}${tier.slice(1)} ${roman}`
    : `${tier[0]!.toUpperCase()}${tier.slice(1)}`;
  const rankKeyHint = roman ? `${tier}_${roman.toLowerCase()}` : tier;
  const wins = solo[2] === "null" ? null : Number(solo[2]);
  const losses = solo[3] === "null" ? null : Number(solo[3]);

  const topUnits: { name: string; games?: number; winRate?: number }[] = [];
  // ChampionStat(id,play,win,lose,...,"Jhin")
  for (const m of text.matchAll(
    /ChampionStat\(\d+,(\d+),(\d+),(\d+),[^"]*"([^"]+)"\)/g,
  )) {
    const play = Number(m[1]);
    const win = Number(m[2]);
    topUnits.push({
      name: m[4]!,
      games: play,
      winRate: play > 0 ? Math.round((win / play) * 1000) / 10 : undefined,
    });
    if (topUnits.length >= 5) break;
  }

  return {
    rankLabel,
    rankKeyHint,
    lp: Number.isFinite(lp) ? lp : null,
    wins: Number.isFinite(wins as number) ? wins : null,
    losses: Number.isFinite(losses as number) ? losses : null,
    topUnits,
    raw: {
      queue: solo[0],
      tier,
      division: divNum,
      lp,
      wins,
      losses,
    },
  };
}

function parseToolPayload(data: {
  result?: {
    content?: { type: string; text?: string }[];
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
  };
  error?: { message?: string };
}): {
  profile: Record<string, unknown>;
  toolError?: string;
  mcpText?: string;
} {
  if (data.error?.message) {
    return { profile: {}, toolError: data.error.message };
  }
  let profile: Record<string, unknown> = data.result?.structuredContent ?? {};
  const text = data.result?.content?.find((c) => c.type === "text")?.text;
  if (text) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        // Validation errors often come back as JSON in the text content.
        if (
          parsed.tag_line ||
          parsed.game_name ||
          parsed.tagline ||
          (Array.isArray(parsed.tag_line) && parsed.tag_line.length)
        ) {
          const msg = Object.entries(parsed)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
            .join("; ");
          if (
            "tag_line" in parsed ||
            "game_name" in parsed ||
            "region" in parsed
          ) {
            return { profile: {}, toolError: msg };
          }
          profile = { ...profile, ...parsed };
        } else if (Object.keys(profile).length === 0) {
          profile = parsed;
        }
      }
    } catch {
      // Not JSON — OP.GG MCP returns a Python-style dump; keep text for parseOpGgMcpText.
      if (data.result?.isError) {
        return { profile: {}, toolError: text };
      }
      return { profile, mcpText: text };
    }
  }
  if (data.result?.isError && text) {
    return { profile: {}, toolError: text };
  }
  return { profile, mcpText: text };
}

/** OP.GG MCP HTTP tools/call for summoner profile (no Riot key). */
async function lookupLol(input: RankLookupInput): Promise<RankLookupResult> {
  const region = (input.server ?? "euw").toLowerCase();
  const tag = (input.tag ?? "").trim();
  const gameName = input.name.trim();
  if (!tag) {
    return baseResult(input, {
      ok: true,
      live: false,
      provider: "op.gg",
      error: "Tag is required (e.g. Name#1478)",
    });
  }

  try {
    const res = await fetch("https://mcp-api.op.gg/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "lol_get_summoner_profile",
          arguments: {
            // OP.GG schema uses snake_case tag_line (not tagline).
            game_name: gameName,
            tag_line: tag,
            region,
          },
        },
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      return baseResult(input, {
        ok: true,
        live: false,
        provider: "op.gg",
        error: `OP.GG unavailable (${res.status})`,
      });
    }

    const data = (await res.json()) as {
      result?: {
        content?: { type: string; text?: string }[];
        structuredContent?: Record<string, unknown>;
        isError?: boolean;
      };
      error?: { message?: string };
    };

    const { profile, toolError, mcpText } = parseToolPayload(data);
    if (toolError) {
      return baseResult(input, {
        ok: true,
        live: false,
        provider: "op.gg",
        error: toolError,
      });
    }

    // Prefer structured/JSON profile when present; otherwise parse OP.GG's Python dump.
    if (mcpText && Object.keys(profile).length === 0) {
      const parsed = parseOpGgMcpText(mcpText);
      return baseResult(input, {
        ok: true,
        live: true,
        provider: "op.gg",
        rankLabel: parsed.rankLabel ?? "Unranked",
        rankKeyHint: parsed.rankKeyHint,
        lpOrRr: parsed.lp,
        wins: parsed.wins,
        losses: parsed.losses,
        topUnits: parsed.topUnits,
        raw: parsed.raw,
        error: parsed.rankLabel ? undefined : "Unranked — no solo/duo data on OP.GG",
      });
    }

    const rankSummary =
      (profile.rank_summary as Record<string, unknown> | undefined) ??
      (profile.ranked as Record<string, unknown> | undefined) ??
      profile;
    const tier = String(
      rankSummary.tier ?? rankSummary.rank ?? rankSummary.solo_tier ?? "",
    );
    const division = String(
      rankSummary.division ?? rankSummary.rank_division ?? "",
    );
    const lp = Number(
      rankSummary.lp ?? rankSummary.league_points ?? rankSummary.points ?? NaN,
    );
    let rankLabel = [tier, division].filter(Boolean).join(" ") || null;
    let wins = Number(rankSummary.wins ?? NaN);
    let losses = Number(rankSummary.losses ?? NaN);
    let lpOrRr = Number.isFinite(lp) ? lp : null;
    let rankKeyHint = hintFromLabel(rankLabel);
    let topUnits =
      (
        profile.top_champions as
          | { name?: string; champion?: string; games?: number; win_rate?: number }[]
          | undefined
      )?.slice(0, 5).map((c) => ({
        name: String(c.name ?? c.champion ?? "Unknown"),
        games: c.games,
        winRate: c.win_rate,
      })) ?? [];
    let raw: Record<string, unknown> = profile;

    // If JSON profile lacked rank fields, fall back to MCP text dump.
    if (!rankLabel && mcpText) {
      const parsed = parseOpGgMcpText(mcpText);
      rankLabel = parsed.rankLabel;
      rankKeyHint = parsed.rankKeyHint;
      lpOrRr = parsed.lp;
      wins = parsed.wins ?? NaN;
      losses = parsed.losses ?? NaN;
      topUnits = parsed.topUnits.length ? parsed.topUnits : topUnits;
      raw = { ...profile, mcp: parsed.raw };
    }

    return baseResult(input, {
      ok: true,
      live: true,
      provider: "op.gg",
      rankLabel: rankLabel ?? "Unranked",
      rankKeyHint,
      lpOrRr,
      wins: Number.isFinite(wins) ? wins : null,
      losses: Number.isFinite(losses) ? losses : null,
      topUnits,
      raw,
      error: rankLabel ? undefined : "Unranked — no solo/duo data on OP.GG",
    });
  } catch (e) {
    return baseResult(input, {
      ok: true,
      live: false,
      provider: "op.gg",
      error: e instanceof Error ? e.message : "OP.GG lookup failed",
    });
  }
}

async function lookupValorant(
  input: RankLookupInput,
): Promise<RankLookupResult> {
  const key = process.env.HENRIK_API_KEY?.trim();
  if (!key) {
    return baseResult(input, {
      ok: true,
      live: false,
      provider: "henrik",
      error: "HENRIK_API_KEY not configured",
    });
  }
  const tag = (input.tag ?? "").trim();
  if (!tag) {
    return baseResult(input, {
      ok: true,
      live: false,
      provider: "henrik",
      error: "Tag is required (e.g. Name#1478)",
    });
  }
  // Catalog servers are often euw/eune/na — Henrik wants affinity (eu, na, ap, kr).
  const rawServer = (input.server ?? "eu").toLowerCase();
  const region =
    rawServer.startsWith("eu") || rawServer === "euw" || rawServer === "eune"
      ? "eu"
      : rawServer.startsWith("na")
        ? "na"
        : rawServer.startsWith("kr")
          ? "kr"
          : rawServer.startsWith("ap") || rawServer === "oce"
            ? "ap"
            : rawServer === "br" || rawServer === "latam"
              ? rawServer
              : rawServer;
  // Platform must be pc/console — never the region (a prior bug sent eu/eu/…).
  const rawPlatform = (input.platform ?? "pc").toLowerCase();
  const platform = ["pc", "console"].includes(rawPlatform)
    ? rawPlatform
    : "pc";
  const url = `https://api.henrikdev.xyz/valorant/v3/mmr/${encodeURIComponent(region)}/${encodeURIComponent(platform)}/${encodeURIComponent(input.name.trim())}/${encodeURIComponent(tag)}`;
  // Henrik expects the raw API key in Authorization — no "Bearer" prefix.
  const authValue = key.replace(/^bearer\s+/i, "").trim();
  try {
    const res = await fetch(url, {
      headers: { Authorization: authValue, Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return baseResult(input, {
        ok: true,
        live: false,
        provider: "henrik",
        error: `Lookup failed (${res.status})`,
      });
    }
    const json = (await res.json()) as {
      data?: {
        current?: {
          tier?: { name?: string };
          rr?: number;
        };
        peak?: { tier?: { name?: string } };
        seasonal?: { wins?: number; games?: number }[];
      };
    };
    const current = json.data?.current;
    const rankLabel = current?.tier?.name ?? null;
    const seasonal = json.data?.seasonal?.[0];
    const wins = seasonal?.wins ?? null;
    const games = seasonal?.games ?? null;
    const losses =
      wins != null && games != null ? Math.max(0, games - wins) : null;

    return baseResult(input, {
      ok: true,
      live: true,
      provider: "henrik",
      rankLabel: rankLabel ?? "Unranked",
      rankKeyHint: rankLabel ? hintFromLabel(rankLabel) : null,
      lpOrRr: current?.rr ?? null,
      wins,
      losses,
      peakLabel: json.data?.peak?.tier?.name ?? null,
      raw: json.data as Record<string, unknown> | undefined,
      error: rankLabel ? undefined : "Unranked — no competitive rating yet",
    });
  } catch (e) {
    return baseResult(input, {
      ok: true,
      live: false,
      provider: "henrik",
      error: e instanceof Error ? e.message : "Valorant lookup failed",
    });
  }
}

type OwRoleRank = {
  division?: string | null;
  tier?: number | null;
  rank_icon?: string | null;
};

type OwPlatformRanks = {
  tank?: OwRoleRank | null;
  damage?: OwRoleRank | null;
  support?: OwRoleRank | null;
  open?: OwRoleRank | null;
  season?: number | null;
};

function formatOwRole(role: string, info: OwRoleRank): string {
  const div = String(info.division ?? "").trim();
  const tier = info.tier != null ? String(info.tier) : "";
  const label = [div, tier].filter(Boolean).join(" ");
  return label ? `${role}: ${label}` : role;
}

function pickOwPlatform(
  competitive: Record<string, unknown> | undefined,
  platformHint?: string,
): OwPlatformRanks | null {
  if (!competitive) return null;
  const hint = (platformHint ?? "pc").toLowerCase();
  const preferConsole = hint.includes("console") || hint === "xbox" || hint === "psn" || hint === "switch";
  const ordered = preferConsole
    ? ["console", "pc"]
    : ["pc", "console"];
  for (const key of ordered) {
    const block = competitive[key];
    if (block && typeof block === "object") return block as OwPlatformRanks;
  }
  // Legacy flat shape (role → rank) — rare, but keep fallback.
  if ("tank" in competitive || "damage" in competitive || "support" in competitive) {
    return competitive as OwPlatformRanks;
  }
  return null;
}

async function fetchOverfastSummary(
  playerId: string,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; status: number; retryAfter?: number }> {
  const res = await fetch(
    `https://overfast-api.tekrop.fr/players/${playerId}/summary`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) {
    let retryAfter: number | undefined;
    try {
      const detail = (await res.json()) as { retry_after?: number };
      retryAfter = detail.retry_after;
    } catch {
      /* ignore */
    }
    return { ok: false, status: res.status, retryAfter };
  }
  return { ok: true, data: (await res.json()) as Record<string, unknown> };
}

/** Blizzard search is flaky empty — retry a few times across locales. */
async function blizzardOwSearch(
  name: string,
): Promise<{ isPublic: boolean; url?: string; name?: string } | null> {
  const headers = {
    Accept: "application/json",
    "User-Agent": "HardStuck/1.0",
    "Accept-Language": "en-GB,en;q=0.9",
  };
  for (const locale of ["en-gb", "en-us"] as const) {
    for (let i = 0; i < 4; i++) {
      try {
        const res = await fetch(
          `https://overwatch.blizzard.com/${locale}/search/account-by-name/${encodeURIComponent(name)}/`,
          { headers, signal: AbortSignal.timeout(10_000) },
        );
        if (!res.ok) continue;
        const rows = (await res.json()) as {
          isPublic?: boolean;
          url?: string;
          name?: string;
        }[];
        if (!Array.isArray(rows) || rows.length === 0) {
          await new Promise((r) => setTimeout(r, 250));
          continue;
        }
        const hit =
          rows.find((r) => r.name?.toLowerCase() === name.toLowerCase()) ??
          rows[0]!;
        return {
          isPublic: Boolean(hit.isPublic),
          url: hit.url,
          name: hit.name,
        };
      } catch {
        /* retry */
      }
    }
  }
  return null;
}

/** Resolve Blizzard career player id from Battletag (case-sensitive routing). */
async function blizzardOwPlayerId(battletag: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://overwatch.blizzard.com/en-us/career/${encodeURIComponent(battletag)}/`,
      {
        headers: {
          Accept: "text/html",
          "User-Agent": "HardStuck/1.0",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      },
    );
    const loc = res.headers.get("location") ?? "";
    const m = loc.match(/\/career\/([^/?#]+)/i);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

function owResultFromRoles(
  input: RankLookupInput,
  roleEntries: [string, OwRoleRank][],
  provider: string,
  raw: Record<string, unknown>,
): RankLookupResult {
  const first = roleEntries[0]?.[1];
  const rankLabel = first
    ? `${String(first.division ?? "")} ${first.tier ?? ""}`.trim()
    : null;
  const rankKeyHint = first?.division
    ? `${String(first.division).toLowerCase()}_${first.tier ?? ""}`.replace(
        /_$/,
        "",
      )
    : null;

  return baseResult(input, {
    ok: true,
    live: Boolean(rankLabel),
    provider,
    rankLabel,
    rankKeyHint,
    topUnits: roleEntries.map(([role, info]) => ({
      name: formatOwRole(role, info),
    })),
    raw,
    error: rankLabel
      ? undefined
      : "No competitive ranks (unranked or private roles)",
  });
}

function owResultFromSummary(
  input: RankLookupInput,
  data: Record<string, unknown>,
  provider = "overfast",
  extras?: {
    wins?: number | null;
    losses?: number | null;
    topHero?: string | null;
    season?: number | null;
  },
): RankLookupResult {
  const platform = pickOwPlatform(
    data.competitive as Record<string, unknown> | undefined,
    input.platform ?? input.server,
  );
  const roleEntries = (
    [
      ["tank", platform?.tank],
      ["damage", platform?.damage],
      ["support", platform?.support],
      ["open", platform?.open],
    ] as const
  ).filter(([, info]) => info && info.division) as [string, OwRoleRank][];

  if (roleEntries.length > 0) {
    const ranked = owResultFromRoles(input, roleEntries, provider, data);
    return {
      ...ranked,
      wins: extras?.wins ?? ranked.wins,
      losses: extras?.losses ?? ranked.losses,
      topUnits:
        ranked.topUnits.length > 0
          ? ranked.topUnits
          : extras?.topHero
            ? [{ name: extras.topHero }]
            : [],
    };
  }

  // Profile is public and fetched — roles just have no rank icons yet.
  const season = extras?.season ?? (platform as { season?: number } | null)?.season;
  return baseResult(input, {
    ok: true,
    live: true,
    provider,
    rankLabel: null,
    rankKeyHint: null,
    wins: extras?.wins ?? null,
    losses: extras?.losses ?? null,
    topUnits: extras?.topHero ? [{ name: extras.topHero }] : [],
    raw: data,
    error: season
      ? `Unranked this season (S${season}) — no role ranks posted yet`
      : "Unranked — no role ranks posted on the career page",
  });
}

/** Secondary provider — same Blizzard career source, different scraper cache. */
async function lookupOverwatchOwApi(
  input: RankLookupInput,
  battletag: string,
): Promise<RankLookupResult | null> {
  const platformHint = (input.platform ?? input.server ?? "pc").toLowerCase();
  const platform =
    platformHint.includes("console") ||
    platformHint === "xbox" ||
    platformHint === "psn"
      ? "console"
      : "pc";
  try {
    const res = await fetch(
      `https://owapi.eu/stats/${platform}/${encodeURIComponent(battletag)}/profile`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(18_000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      private?: boolean;
      ratings?: {
        group?: string;
        tier?: number;
        role?: string;
      }[];
      competitiveStats?: {
        gamesWon?: number;
        gamesLost?: number;
        mostPlayedHero?: string;
        season?: number;
      };
    };
    if (data.private) {
      return baseResult(input, {
        ok: true,
        live: false,
        provider: "owapi",
        error: "Profile is private on Blizzard",
      });
    }
    const roleEntries = (data.ratings ?? [])
      .filter((r) => r.group)
      .map(
        (r) =>
          [
            String(r.role ?? "role"),
            {
              division: String(r.group).toLowerCase(),
              tier: r.tier ?? null,
            },
          ] as [string, OwRoleRank],
      );
    const extras = {
      wins: data.competitiveStats?.gamesWon ?? null,
      losses: data.competitiveStats?.gamesLost ?? null,
      topHero: data.competitiveStats?.mostPlayedHero ?? null,
      season: data.competitiveStats?.season ?? null,
    };
    if (roleEntries.length > 0) {
      const result = owResultFromRoles(
        input,
        roleEntries,
        "owapi",
        data as Record<string, unknown>,
      );
      return {
        ...result,
        wins: extras.wins ?? result.wins,
        losses: extras.losses ?? result.losses,
        topUnits:
          result.topUnits.length > 0
            ? result.topUnits
            : extras.topHero
              ? [{ name: extras.topHero }]
              : [],
      };
    }
    // Found profile, no ratings — still a successful live lookup.
    return baseResult(input, {
      ok: true,
      live: true,
      provider: "owapi",
      rankLabel: null,
      wins: extras.wins,
      losses: extras.losses,
      topUnits: extras.topHero ? [{ name: extras.topHero }] : [],
      raw: data as Record<string, unknown>,
      error: extras.season
        ? `Unranked this season (S${extras.season}) — no role ranks posted yet`
        : "Unranked — no role ranks posted on the career page",
    });
  } catch {
    return null;
  }
}

async function lookupOverwatch(
  input: RankLookupInput,
): Promise<RankLookupResult> {
  const name = input.name.trim();
  const tag = (input.tag ?? "").trim().replace(/^#/, "");
  if (!name || !tag) {
    return baseResult(input, {
      ok: true,
      live: false,
      provider: "overfast",
      error: "Battletag required (Name#1234)",
    });
  }

  // Prefer exact Battletag casing first — lowercase can be poison-cached as 404.
  const battletags = Array.from(
    new Set([`${name}-${tag}`, `${name.toLowerCase()}-${tag}`]),
  );

  try {
    let seasonExtras:
      | {
          wins?: number | null;
          losses?: number | null;
          topHero?: string | null;
          season?: number | null;
        }
      | undefined;
    let owapiLive: RankLookupResult | null = null;

    for (const bt of battletags) {
      const owapi = await lookupOverwatchOwApi(input, bt);
      if (owapi?.live && owapi.rankLabel) return owapi;
      if (owapi && !owapi.live && owapi.error?.includes("private")) return owapi;
      if (owapi?.live) {
        owapiLive = owapi;
        if (!seasonExtras) {
          seasonExtras = {
            wins: owapi.wins,
            losses: owapi.losses,
            topHero: owapi.topUnits[0]?.name ?? null,
            season: (owapi.raw as { competitiveStats?: { season?: number } })
              ?.competitiveStats?.season,
          };
        }
      }
    }

    const triedIds = new Set<string>();

    for (const bt of battletags) {
      const direct = await fetchOverfastSummary(encodeURIComponent(bt));
      if (direct.ok) {
        return owResultFromSummary(input, direct.data, "overfast", seasonExtras);
      }
      triedIds.add(bt.toLowerCase());
    }

    // Resolve Blizzard player id(s) from career redirects + name search.
    const playerIds: string[] = [];
    for (const bt of battletags) {
      const id = await blizzardOwPlayerId(bt);
      if (id && !triedIds.has(id.toLowerCase())) {
        playerIds.push(id);
        triedIds.add(id.toLowerCase());
      }
    }

    const search = await blizzardOwSearch(name);
    if (search?.url && !triedIds.has(decodeURIComponent(search.url).toLowerCase())) {
      playerIds.push(search.url);
    }

    for (const id of playerIds) {
      const encoded = id.includes("%") ? id : encodeURIComponent(id);
      const hit = await fetchOverfastSummary(encoded);
      if (hit.ok) {
        return owResultFromSummary(input, hit.data, "overfast", seasonExtras);
      }
    }

    if (owapiLive) return owapiLive;

    // Search may say isPublic, and the player can view their own page while
    // logged in — but anonymous career URLs still 404 until Blizzard exposes
    // them publicly (what OverFast / owapi / our lookup use).
    if (search?.isPublic || playerIds.length > 0) {
      return baseResult(input, {
        ok: true,
        live: false,
        provider: "blizzard",
        error:
          "Blizzard shows your career while you are logged in, but the public page still 404s for everyone else (incognito / logged out). Live rank needs that public page. In Overwatch: Options → Social → Career Profile Visibility → Public, fully restart the client, then open the Blizzard link in a private window — when it loads there, Refresh here.",
      });
    }

    return baseResult(input, {
      ok: true,
      live: false,
      provider: "blizzard",
      error:
        "Not found on Blizzard — in Overwatch go to Options → Social → Career Profile Visibility → Public, restart the game, then Refresh.",
    });
  } catch (e) {
    return baseResult(input, {
      ok: true,
      live: false,
      provider: "overfast",
      error: e instanceof Error ? e.message : "Overwatch lookup failed",
    });
  }
}

const APEX_DIV_ROMAN: Record<string, string> = {
  "1": "I",
  "2": "II",
  "3": "III",
  "4": "IV",
};

/** I/l lookalike + case variants — Tracker often shows capital-I where users type L. */
function apexNameVariants(name: string): string[] {
  const n = name.trim();
  const out = new Set<string>([n]);
  if (/[Il]/.test(n)) {
    out.add(n.replaceAll("l", "I"));
    out.add(n.replaceAll("I", "l"));
    out.add(n.replaceAll("l", "I").replaceAll("i", "I"));
  }
  out.add(n.toUpperCase());
  out.add(n.toLowerCase());
  return [...out].filter(Boolean);
}

function apexRankHint(rankName: string, rankDiv: number | null): string {
  const tier = rankName.toLowerCase().replace(/\s+/g, "_");
  if (tier === "master" || tier === "predator" || tier === "unranked") {
    return tier === "unranked" ? "rookie_iv" : tier;
  }
  if (rankDiv == null || rankDiv <= 0) return tier;
  const roman = APEX_DIV_ROMAN[String(rankDiv)] ?? String(rankDiv);
  return `${tier}_${roman.toLowerCase()}`;
}

const APEX_STATUS_HOSTS = [
  "https://api.mozambiquehe.re",
  "https://api.apexlegendsstatus.com",
] as const;

async function fetchMozambiqueBridge(opts: {
  key: string;
  platform: string;
  player?: string;
  uid?: string;
}): Promise<
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; message: string }
> {
  const params = new URLSearchParams({
    auth: opts.key,
    platform: opts.platform,
    version: "5",
  });
  if (opts.uid) params.set("uid", opts.uid);
  else if (opts.player) params.set("player", opts.player);
  else return { ok: false, status: 400, message: "player or uid required" };

  let lastFail: { ok: false; status: number; message: string } | null = null;
  for (const host of APEX_STATUS_HOSTS) {
    try {
      // Do NOT send Accept: application/json — host may return HTTP 406 HTML.
      const res = await fetch(`${host}/bridge?${params.toString()}`, {
        headers: { Accept: "*/*", "User-Agent": "HardStuck/1.0" },
        signal: AbortSignal.timeout(15_000),
      });
      const text = await res.text();
      let json: Record<string, unknown> | null = null;
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        /* non-JSON */
      }
      if (!res.ok) {
        const errMsg =
          (typeof json?.Error === "string" && json.Error) ||
          (typeof json?.error === "string" && json.error) ||
          `Apex API ${res.status}`;
        lastFail = { ok: false, status: res.status, message: errMsg };
        if (res.status === 404 || res.status === 403 || res.status === 429) {
          return lastFail;
        }
        continue;
      }
      if (json && typeof json.Error === "string") {
        return { ok: false, status: 404, message: json.Error };
      }
      return { ok: true, data: json ?? {} };
    } catch (e) {
      lastFail = {
        ok: false,
        status: 0,
        message: e instanceof Error ? e.message : "Apex bridge failed",
      };
    }
  }
  return lastFail ?? { ok: false, status: 0, message: "Apex bridge failed" };
}

type TrnStat = {
  value?: number | string;
  displayValue?: string;
  rank?: number;
  percentile?: number;
  metadata?: { rankName?: string; name?: string; iconUrl?: string };
};

function parseApexRankLabel(raw: string): {
  rankName: string;
  rankDiv: number | null;
  rankLabel: string | null;
} {
  const cleaned = raw.trim();
  if (!cleaned || /^unranked$/i.test(cleaned)) {
    return { rankName: "Unranked", rankDiv: null, rankLabel: null };
  }
  const m = cleaned.match(/^([A-Za-z]+)(?:\s+(\d+|[IVX]+))?$/);
  if (!m) {
    return { rankName: cleaned, rankDiv: null, rankLabel: cleaned };
  }
  const rankName = m[1]!;
  let rankDiv: number | null = null;
  if (m[2]) {
    const roman: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };
    rankDiv = /^\d+$/.test(m[2])
      ? Number(m[2])
      : (roman[m[2].toUpperCase()] ?? null);
  }
  const romanOut = rankDiv != null ? APEX_DIV_ROMAN[String(rankDiv)] : null;
  const rankLabel = [rankName, romanOut ?? m[2] ?? ""].filter(Boolean).join(" ");
  return { rankName, rankDiv, rankLabel };
}

/** Tracker Network public API — primary for Apex when TRN_API_KEY is set. */
async function lookupApexTracker(
  input: RankLookupInput,
): Promise<RankLookupResult | null> {
  const key =
    process.env.TRN_API_KEY?.trim() ||
    process.env.TRACKER_GG_API_KEY?.trim();
  if (!key) return null;

  const rawPlatform = (input.platform ?? input.server ?? "pc").toLowerCase();
  const platforms =
    rawPlatform === "psn" ||
    rawPlatform === "ps4" ||
    rawPlatform === "playstation"
      ? ["psn"]
      : rawPlatform === "xbox" || rawPlatform === "x1" || rawPlatform === "xbl"
        ? ["xbl"]
        : ["origin", "steam"];

  const names = apexNameVariants(input.name);
  const rawTag = (input.tag ?? "").trim();
  if (
    rawTag &&
    !/^(pc|psn|ps4|xbox|x1)$/i.test(rawTag) &&
    !/^\d{6,}$/.test(rawTag)
  ) {
    for (const v of apexNameVariants(rawTag)) names.push(v);
  }
  const uniqueNames = [...new Set(names)];

  try {
    for (const platform of platforms) {
      for (const player of uniqueNames) {
        const url = `https://public-api.tracker.gg/v2/apex/standard/profile/${platform}/${encodeURIComponent(player)}`;
        const res = await fetch(url, {
          headers: {
            "TRN-Api-Key": key,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(15_000),
        });
        if (res.status === 404) continue;
        if (res.status === 401 || res.status === 403) {
          return baseResult(input, {
            ok: true,
            live: false,
            provider: "tracker.gg",
            error:
              res.status === 401
                ? "Tracker.gg 401 — open Developers → your app → Apply for Production Use (fix App URL first), then Refresh"
                : `Tracker.gg denied this title/key (${res.status})`,
          });
        }
        if (!res.ok) continue;

        const json = (await res.json()) as {
          data?: {
            platformInfo?: { platformUserHandle?: string };
            segments?: {
              type?: string;
              metadata?: { name?: string };
              stats?: Record<string, TrnStat>;
            }[];
          };
        };
        const overview =
          json.data?.segments?.find((s) => s.type === "overview") ??
          json.data?.segments?.[0];
        const stats = overview?.stats ?? {};
        const rankStat =
          stats.rankScore ?? stats.rank ?? stats.arenaRankScore;
        const rankRaw =
          rankStat?.metadata?.rankName ??
          rankStat?.displayValue ??
          "";
        const { rankName, rankDiv, rankLabel } = parseApexRankLabel(
          String(rankRaw),
        );
        const rp = Number(rankStat?.value);
        const peakStat = stats.lifetimePeakRankScore ?? stats.peakRankScore;
        const peakRaw = peakStat?.metadata?.rankName ?? peakStat?.displayValue;
        const legendSeg = json.data?.segments?.find((s) => s.type === "legend");
        const legendName =
          legendSeg?.metadata?.name ??
          stats.legend?.metadata?.name ??
          null;

        return baseResult(input, {
          ok: true,
          // Live = EA/TRN answered; unranked this split is still a live sync.
          live: true,
          provider: "tracker.gg",
          rankLabel: rankLabel ?? "Unranked",
          rankKeyHint: rankLabel
            ? apexRankHint(rankName, rankDiv)
            : "rookie_iv",
          lpOrRr: Number.isFinite(rp) ? rp : 0,
          peakLabel: peakRaw ? String(peakRaw) : null,
          topUnits: legendName ? [{ name: String(legendName) }] : [],
          raw: {
            platform,
            handle: json.data?.platformInfo?.platformUserHandle,
            rank: rankStat,
            peak: peakStat,
          },
          error: rankLabel
            ? undefined
            : peakRaw
              ? `Unranked this split · peak ${peakRaw}`
              : "Unranked this split (no ranked RP yet)",
        });
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function lookupApexMozambique(
  input: RankLookupInput,
): Promise<RankLookupResult | null> {
  const key = process.env.APEX_API_KEY?.trim();
  if (!key) return null;

  const rawPlatform = (input.platform ?? input.server ?? "PC").toLowerCase();
  const platform =
    rawPlatform === "psn" ||
    rawPlatform === "ps4" ||
    rawPlatform === "playstation"
      ? "PS4"
      : rawPlatform === "xbox" || rawPlatform === "x1" || rawPlatform === "xbl"
        ? "X1"
        : "PC";

  const rawTag = (input.tag ?? "").trim();
  const tagIsPlatform = /^(pc|psn|ps4|xbox|x1)$/i.test(rawTag);
  const uid =
    !tagIsPlatform && /^\d{6,}$/.test(rawTag) ? rawTag : undefined;

  let hit:
    | { ok: true; data: Record<string, unknown> }
    | { ok: false; status: number; message: string }
    | null = null;

  if (uid) {
    hit = await fetchMozambiqueBridge({ key, platform, uid });
  } else {
    const names = apexNameVariants(input.name);
    if (
      rawTag &&
      !tagIsPlatform &&
      rawTag.toLowerCase() !== input.name.trim().toLowerCase()
    ) {
      for (const v of apexNameVariants(rawTag)) names.push(v);
    }
    const uniqueNames = [...new Set(names)];
    let lastFail: { ok: false; status: number; message: string } | null = null;
    for (const player of uniqueNames) {
      const attempt = await fetchMozambiqueBridge({ key, platform, player });
      if (attempt.ok) {
        hit = attempt;
        break;
      }
      lastFail = attempt;
      if (attempt.status === 403 || attempt.status === 429) {
        hit = attempt;
        break;
      }
    }
    if (!hit) hit = lastFail;
  }

  if (!hit || !hit.ok) {
    return baseResult(input, {
      ok: true,
      live: false,
      provider: "mozambique",
      error:
        hit?.message?.includes("Player not found") ||
        hit?.message?.includes("wrong username") ||
        hit?.message?.includes("Origin refusing")
          ? "EA can’t find that name — use your EA/Origin username (not Steam), or paste EA UID in the tag field"
          : (hit?.message ?? "Apex lookup failed"),
    });
  }

  const data = hit.data as {
    global?: {
      name?: string;
      tag?: string;
      uid?: string;
      level?: number;
      rank?: {
        rankName?: string;
        rankDiv?: number;
        rankScore?: number;
        ALStopPercent?: string;
        ALSFlag?: boolean;
      };
    };
    legends?: {
      selected?: {
        LegendName?: string;
        data?: { name?: string; value?: number | string }[];
      };
    };
  };
  const rank = data.global?.rank;
  const rankName = String(rank?.rankName ?? "").trim();
  const rankDiv =
    rank?.rankDiv != null && rank.rankDiv > 0 ? rank.rankDiv : null;
  const isUnranked = !rankName || /^unranked$/i.test(rankName);
  const roman = rankDiv != null ? APEX_DIV_ROMAN[String(rankDiv)] : null;
  const rankLabel = isUnranked
    ? "Unranked"
    : [rankName, roman ?? (rankDiv != null ? String(rankDiv) : "")]
        .filter(Boolean)
        .join(" ");
  const noGamesThisSplit =
    Boolean(rank?.ALSFlag) ||
    /no game this split/i.test(String(rank?.ALStopPercent ?? ""));

  const selected = data.legends?.selected;
  const topUnits = selected?.LegendName
    ? [
        {
          name: selected.LegendName,
          ...(selected.data?.[0]
            ? { games: Number(selected.data[0].value) || undefined }
            : {}),
        },
      ]
    : [];

  return baseResult(input, {
    ok: true,
    // Profile fetched from EA — unranked ≠ offline.
    live: true,
    provider: "mozambique",
    rankLabel,
    rankKeyHint: isUnranked
      ? "rookie_iv"
      : apexRankHint(rankName, rankDiv),
    lpOrRr: rank?.rankScore ?? 0,
    peakLabel: null,
    topUnits,
    raw: {
      name: data.global?.name,
      tag: data.global?.tag,
      uid: data.global?.uid,
      level: data.global?.level,
      rank,
    },
    error: isUnranked
      ? noGamesThisSplit
        ? "Live from EA — no ranked games this split yet (peak RP isn’t on Mozambique; set rank manually if you need last split)"
        : "Live from EA — unranked this split"
      : undefined,
  });
}

function apexProviderBlocked(result: RankLookupResult | null): boolean {
  if (!result) return true;
  return Boolean(
    result.error?.match(
      /401|403|denied|Apply for Production|TRN_API_KEY|unavailable/i,
    ),
  );
}

async function lookupApex(input: RankLookupInput): Promise<RankLookupResult> {
  try {
    // Prefer Tracker.gg when keyed — but never let a 401 block Mozambique.
    const trn = await lookupApexTracker(input);
    if (trn?.live) return trn;
    if (trn && !apexProviderBlocked(trn)) return trn;

    const moz = await lookupApexMozambique(input);
    if (moz?.live) return moz;
    if (moz && !moz.error?.match(/Player not found|can’t find|can't find/i)) {
      return moz;
    }

    // Prefer the more actionable error when both miss.
    if (trn && apexProviderBlocked(trn) && moz) {
      return baseResult(input, {
        ok: true,
        live: false,
        provider: moz.provider,
        error: [
          moz.error,
          "Tracker.gg key isn’t production-approved yet (401)",
        ]
          .filter(Boolean)
          .join(" · "),
        raw: { trn: trn.raw, mozambique: moz.raw },
      });
    }
    if (moz) return moz;
    if (trn) return trn;

    return baseResult(input, {
      ok: true,
      live: false,
      provider: "mozambique",
      error:
        "Set APEX_API_KEY (apexlegendsapi.com) for Apex live rank. Tracker.gg needs a production-approved TRN_API_KEY.",
    });
  } catch (e) {
    return baseResult(input, {
      ok: true,
      live: false,
      provider: "mozambique",
      error: e instanceof Error ? e.message : "Apex lookup failed",
    });
  }
}

/** Map OP.GG / NetEase Marvel rank labels onto catalog keys (bronze_3 … one_above_all). */
function marvelRankHint(label: string | null | undefined): string | null {
  if (!label) return null;
  const s = label.toLowerCase().trim().replace(/[_-]+/g, " ");
  if (s.includes("one above all") || s === "oaa") return "one_above_all";
  if (s === "eternity") return "eternity";
  const m = s.match(
    /^(bronze|silver|gold|platinum|diamond|grandmaster|celestial)\s*(iii|ii|i|3|2|1)?$/,
  );
  if (!m) return hintFromLabel(label);
  const tier = m[1]!;
  const divRaw = (m[2] ?? "").toLowerCase();
  const div =
    divRaw === "iii" || divRaw === "3"
      ? "3"
      : divRaw === "ii" || divRaw === "2"
        ? "2"
        : divRaw === "i" || divRaw === "1"
          ? "1"
          : null;
  return div ? `${tier}_${div}` : tier;
}

type OpGgMarvelPlayer = {
  playerId: string;
  name: string;
  isPrivate: boolean;
  level: number | null;
  score: number | null;
  tierName: string | null;
};

const OPGG_GQL = "https://stats-platform-api.op.gg/graphql";
const OPGG_GQL_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  Origin: "https://op.gg",
  Referer: "https://op.gg/marvel-rivals/",
} as const;

async function opggGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  timeoutMs = 10_000,
): Promise<T | null> {
  try {
    const res = await fetch(OPGG_GQL, {
      method: "POST",
      headers: OPGG_GQL_HEADERS,
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: T; errors?: unknown };
    return data.data ?? null;
  } catch {
    return null;
  }
}

function mapOpGgPlayer(p: {
  playerId?: string;
  name?: string;
  isPrivate?: boolean;
  level?: number | null;
  score?: number | null;
  tier?: { name?: string } | null;
} | null | undefined): OpGgMarvelPlayer | null {
  if (!p?.playerId) return null;
  return {
    playerId: p.playerId,
    name: p.name ?? "",
    isPrivate: Boolean(p.isPrivate),
    level: p.level ?? null,
    score: p.score ?? null,
    tierName: p.tier?.name ?? null,
  };
}

async function fetchOpGgMarvelByPlayerId(
  playerId: string,
): Promise<OpGgMarvelPlayer | null> {
  const data = await opggGraphql<{
    player?: Parameters<typeof mapOpGgPlayer>[0];
  }>(
    `query($game:String!,$playerId:String!){
      player(game:$game, playerId:$playerId){
        playerId name isPrivate level score tier { name }
      }
    }`,
    { game: "marvel-rivals", playerId },
  );
  const current = mapOpGgPlayer(data?.player);
  if (current?.tierName) return current;

  // Current season can be empty mid-reset — fall back through prior seasons.
  const seasons = await opggGraphql<{
    marvelRivalsPlayerSeasons?: number[];
  }>(
    `query($playerId:String!){ marvelRivalsPlayerSeasons(playerId:$playerId) }`,
    { playerId },
  );
  for (const seasonId of seasons?.marvelRivalsPlayerSeasons ?? []) {
    const season = await opggGraphql<{
      marvelRivalsPlayerSeason?: Parameters<typeof mapOpGgPlayer>[0];
    }>(
      `query($playerId:String!,$seasonId:Int!){
        marvelRivalsPlayerSeason(playerId:$playerId, seasonId:$seasonId){
          playerId name isPrivate level score tier { name }
        }
      }`,
      { playerId, seasonId },
    );
    const ranked = mapOpGgPlayer(season?.marvelRivalsPlayerSeason);
    if (ranked?.tierName) {
      return {
        ...ranked,
        name: ranked.name || current?.name || "",
        playerId: ranked.playerId || playerId,
      };
    }
  }
  return current;
}

async function fetchOpGgMarvelByName(
  name: string,
): Promise<OpGgMarvelPlayer | null> {
  const exact = await opggGraphql<{
    playerByNameAndTag?: Parameters<typeof mapOpGgPlayer>[0];
  }>(
    `query($game:String!,$name:String!){
      playerByNameAndTag(game:$game, name:$name){
        playerId name isPrivate level score tier { name }
      }
    }`,
    { game: "marvel-rivals", name },
  );
  const hit = mapOpGgPlayer(exact?.playerByNameAndTag);
  if (hit) return hit;

  const auto = await opggGraphql<{
    playerAutoComplete?: Parameters<typeof mapOpGgPlayer>[0][];
  }>(
    `query($game:String!,$name:String!){
      playerAutoComplete(game:$game, name:$name, limit:5){
        playerId name isPrivate level score tier { name }
      }
    }`,
    { game: "marvel-rivals", name },
  );
  const want = name.trim().toLowerCase();
  const list = auto?.playerAutoComplete ?? [];
  const match =
    list.find((p) => (p?.name ?? "").trim().toLowerCase() === want) ?? list[0];
  return mapOpGgPlayer(match);
}

type OpGgRenewal = {
  status?: string | null;
  retryAfter?: number | null;
};

async function opggMarvelRenewalStatus(
  playerId: string,
): Promise<OpGgRenewal | null> {
  const data = await opggGraphql<{ renewalStatus?: OpGgRenewal | null }>(
    `query($game:String!,$playerId:String!){
      renewalStatus(game:$game, playerId:$playerId){
        status retryAfter
      }
    }`,
    { game: "marvel-rivals", playerId },
  );
  return data?.renewalStatus ?? null;
}

/** Ask OP.GG to pull a UID from NetEase, then poll briefly for the profile. */
async function renewOpGgMarvelPlayer(
  playerId: string,
): Promise<{ player: OpGgMarvelPlayer | null; renewal: OpGgRenewal | null }> {
  const started = await opggGraphql<{ renewal?: OpGgRenewal | null }>(
    `mutation($game:String!,$playerId:String!){
      renewal(game:$game, playerId:$playerId, force:true){
        status retryAfter
      }
    }`,
    { game: "marvel-rivals", playerId },
    12_000,
  );

  let renewal = started?.renewal ?? null;
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 1_500));
    const live = await fetchOpGgMarvelByPlayerId(playerId);
    if (live?.tierName) return { player: live, renewal };
    renewal = (await opggMarvelRenewalStatus(playerId)) ?? renewal;
    if (renewal?.status === "FAIL") break;
  }
  return {
    player: await fetchOpGgMarvelByPlayerId(playerId),
    renewal,
  };
}

/** Optional name → UID via marvelrivalsapi (often 502). */
async function resolveMarvelUidFromApi(
  name: string,
): Promise<string | null> {
  const key = process.env.MARVEL_RIVALS_API_KEY?.trim();
  try {
    const res = await fetch(
      `https://marvelrivalsapi.com/api/v1/find-player/${encodeURIComponent(name)}`,
      {
        headers: {
          Accept: "application/json",
          ...(key ? { "x-api-key": key } : {}),
        },
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { uid?: string | number; name?: string };
    const uid = data.uid != null ? String(data.uid) : null;
    return uid && /^\d{5,}$/.test(uid) ? uid : null;
  } catch {
    return null;
  }
}

function marvelNotFoundError(query: string): string {
  const looksLikeUid = /^\d{5,}$/.test(query);
  if (looksLikeUid) {
    return `No OP.GG data for Player UID ${query} yet — try Update on op.gg/marvel-rivals, or set rank manually`;
  }
  return `“${query}” isn’t on OP.GG by name. Paste your numeric Player UID from Career Overview (or the bottom-left of the main menu) — OP.GG searches by UID, not name.`;
}

/**
 * Marvel via OP.GG GraphQL. MCP only covers LoL/TFT/Val —
 * Marvel uses stats-platform-api.op.gg and prefers numeric Player UIDs.
 */
async function lookupMarvelOpGg(
  input: RankLookupInput,
): Promise<RankLookupResult | null> {
  const query = input.name.trim();
  // Allow tag slot to carry UID when name is the display name.
  const tag = (input.tag ?? "").trim();
  const uidFromTag = /^\d{5,}$/.test(tag) ? tag : null;
  const queryIsUid = /^\d{5,}$/.test(query);

  try {
    let live: OpGgMarvelPlayer | null = null;
    let renewal: OpGgRenewal | null = null;

    if (queryIsUid || uidFromTag) {
      const uid = uidFromTag ?? query;
      live = await fetchOpGgMarvelByPlayerId(uid);
      if (!live?.tierName) {
        const renewed = await renewOpGgMarvelPlayer(uid);
        live = renewed.player ?? live;
        renewal = renewed.renewal;
      }
    } else {
      live = await fetchOpGgMarvelByName(query);
      if (!live?.tierName) {
        const resolvedUid =
          live?.playerId ?? (await resolveMarvelUidFromApi(query));
        if (resolvedUid) {
          const renewed = await renewOpGgMarvelPlayer(resolvedUid);
          live = renewed.player ?? live;
          renewal = renewed.renewal;
        }
      }
    }

    if (!live) {
      return baseResult(input, {
        ok: true,
        live: false,
        provider: "op.gg",
        error: marvelNotFoundError(query),
      });
    }

    if (live.isPrivate && !live.tierName) {
      return baseResult(input, {
        ok: true,
        live: false,
        provider: "op.gg",
        rankLabel: null,
        rankKeyHint: null,
        lpOrRr: live.score,
        raw: { ...live, renewal } as unknown as Record<string, unknown>,
        error:
          "OP.GG profile is private — make it public on op.gg, or set rank manually",
      });
    }

    const rankLabel = live.tierName;
    const updating =
      !rankLabel &&
      (renewal?.status === "PROGRESS" || renewal?.status === "CREATE");
    return baseResult(input, {
      ok: true,
      live: Boolean(rankLabel),
      provider: "op.gg",
      rankLabel,
      rankKeyHint: marvelRankHint(rankLabel),
      lpOrRr: live.score,
      raw: { ...live, renewal } as unknown as Record<string, unknown>,
      error: rankLabel
        ? undefined
        : updating
          ? `Found ${live.name || query} (UID ${live.playerId}) — OP.GG is updating, look up again in ~1 min`
          : live.name
            ? `Found ${live.name} (UID ${live.playerId}) but no competitive rank yet — set privacy to public and retry, or set rank manually`
            : "No competitive rank on OP.GG",
    });
  } catch (e) {
    return baseResult(input, {
      ok: true,
      live: false,
      provider: "op.gg",
      error: e instanceof Error ? e.message : "OP.GG Marvel lookup failed",
    });
  }
}

async function lookupMarvelRivalsApi(
  input: RankLookupInput,
): Promise<RankLookupResult> {
  const key = process.env.MARVEL_RIVALS_API_KEY?.trim();
  const name = input.name.trim();
  const url = `https://marvelrivalsapi.com/api/v1/player/${encodeURIComponent(name)}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(key ? { "x-api-key": key } : {}),
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const down =
        res.status === 502 || res.status === 503 || res.status === 504;
      return baseResult(input, {
        ok: true,
        live: false,
        provider: "marvelrivalsapi",
        error: down
          ? "marvelrivalsapi.com is down (502) — try OP.GG name lookup, or set rank manually"
          : res.status === 401 || res.status === 403
            ? key
              ? `Marvel Rivals API ${res.status} — check MARVEL_RIVALS_API_KEY`
              : "Marvel Rivals API needs MARVEL_RIVALS_API_KEY (fallback only) — OP.GG is preferred"
            : `Marvel Rivals API ${res.status}`,
      });
    }
    const data = (await res.json()) as {
      name?: string;
      rank?: { rank?: string; rank_score?: number; image?: string };
      player?: { rank?: { rank?: string; rank_score?: number } };
    };
    const rankLabel =
      data.rank?.rank ?? data.player?.rank?.rank ?? null;
    const score =
      data.rank?.rank_score ?? data.player?.rank?.rank_score ?? null;
    return baseResult(input, {
      ok: true,
      live: Boolean(rankLabel),
      provider: "marvelrivalsapi",
      rankLabel,
      rankKeyHint: marvelRankHint(rankLabel),
      lpOrRr: score,
      raw: data as Record<string, unknown>,
      error: rankLabel ? undefined : "No competitive rank on profile",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Marvel Rivals lookup failed";
    return baseResult(input, {
      ok: true,
      live: false,
      provider: "marvelrivalsapi",
      error: /fetch|timeout|ECONN|502/i.test(msg)
        ? "marvelrivalsapi.com unreachable — use OP.GG or set rank manually"
        : msg,
    });
  }
}

async function lookupMarvelRivals(
  input: RankLookupInput,
): Promise<RankLookupResult> {
  const name = input.name.trim();
  if (!name) {
    return baseResult(input, {
      ok: true,
      live: false,
      provider: "op.gg",
      error: "In-game name is required",
    });
  }

  // OP.GG first (no API key). MCP is LoL/TFT/Val only — Marvel uses their stats GraphQL.
  const opgg = await lookupMarvelOpGg(input);
  if (opgg?.live) return opgg;
  if (opgg?.error?.includes("private")) return opgg;
  // Found on OP.GG but unranked — don't burn the fallback key.
  if (
    opgg &&
    !opgg.error?.match(/not found|unavailable|failed|timeout|aborted/i)
  ) {
    return opgg;
  }

  const fallback = await lookupMarvelRivalsApi(input);
  if (fallback.live) return fallback;
  if (opgg) {
    return baseResult(input, {
      ok: true,
      live: false,
      provider: "op.gg",
      error: [opgg.error, fallback.error].filter(Boolean).join(" · "),
      raw: { opgg: opgg.raw, fallback: fallback.raw },
    });
  }
  return fallback;
}

export async function lookupRank(
  input: RankLookupInput,
): Promise<RankLookupResult> {
  const handlers: Record<
    GameSlug,
    (i: RankLookupInput) => Promise<RankLookupResult>
  > = {
    lol: lookupLol,
    valorant: lookupValorant,
    overwatch: lookupOverwatch,
    apex: lookupApex,
    marvel_rivals: lookupMarvelRivals,
  };
  return handlers[input.game](input);
}
