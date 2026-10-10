import type { GameSlug } from "@hardstuck/shared";

export type RankLookupInput = {
  game: GameSlug;
  name: string;
  tag?: string;
  server?: string;
  platform?: string;
};

export type RankLookupResult = {
  ok: boolean;
  live: boolean;
  game: GameSlug;
  displayName: string;
  rankLabel: string | null;
  rankKeyHint: string | null;
  lpOrRr: number | null;
  wins: number | null;
  losses: number | null;
  peakLabel: string | null;
  topUnits: { name: string; games?: number; winRate?: number }[];
  trackerUrls: { label: string; url: string }[];
  provider: string;
  fetchedAt: string;
  error?: string;
  raw?: Record<string, unknown>;
};

export interface RankLookupPort {
  lookup(input: RankLookupInput): Promise<RankLookupResult>;
}
