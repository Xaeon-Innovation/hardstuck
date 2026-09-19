import type { GameSlug, ServiceType } from "./enums";
import { CONTRACTOR_SHARE_BPS } from "./enums";
import {
  ADD_ONS,
  getCatalog,
  LP_BANDS,
  LP_GAIN_BANDS,
  rankIndex,
  type AddOnKey,
} from "./catalog";
import { getSku, type SkuDefinition } from "./skus";
import type { DisplayCurrency } from "./schemas";

export type QuoteInput = {
  game: GameSlug;
  serviceType: ServiceType;
  startRankKey: string;
  endRankKey: string;
  server: string;
  queue: string;
  currentLpBand?: (typeof LP_BANDS)[number]["key"];
  lpGainBand?: (typeof LP_GAIN_BANDS)[number]["key"];
  addOnKeys?: AddOnKey[];
  eurPerUsd?: number;
  displayCurrency?: DisplayCurrency;
  /** When set, dispatches specialty / fixed SKUs; rank_climb uses fields above */
  skuSlug?: string;
  /** unit_farm: unit key; progress_band: start/end levels */
  skuPayload?: {
    unitKey?: string;
    startLevel?: number;
    endLevel?: number;
    quantity?: number;
  };
};

export type QuoteLine = {
  key: string;
  label: string;
  amountUsdCents: number;
};

export type PriceQuote = {
  ok: true;
  game: GameSlug;
  serviceType: ServiceType;
  skuSlug: string;
  skuKind: SkuDefinition["kind"];
  startRankKey: string;
  endRankKey: string;
  divisions: number;
  amountUsdCents: number;
  amountEurCents: number;
  displayCurrency: DisplayCurrency;
  displayAmountCents: number;
  lines: QuoteLine[];
  addOnPercentTotal: number;
  contractorShareUsdCents: number;
};

export type QuoteError = {
  ok: false;
  error: string;
};

export type QuoteResult = PriceQuote | QuoteError;

const SERVICE_MULTIPLIER: Record<ServiceType, number> = {
  solo: 1,
  duo: 1.4,
};

function roundCents(n: number): number {
  return Math.max(0, Math.round(n));
}

export function contractorShareCents(amountUsdCents: number): number {
  return roundCents((amountUsdCents * CONTRACTOR_SHARE_BPS) / 10_000);
}

function applyAddOns(
  subtotal: number,
  lines: QuoteLine[],
  input: QuoteInput,
): { subtotal: number; addOnPercentTotal: number; error?: string } {
  const addOns = input.addOnKeys ?? [];
  let addOnPercentTotal = 0;
  let next = subtotal;
  for (const key of addOns) {
    const addOn = ADD_ONS.find((a) => a.key === key);
    if (!addOn) return { subtotal, addOnPercentTotal, error: `Unknown add-on: ${key}` };
    if ("soloOnly" in addOn && addOn.soloOnly && input.serviceType !== "solo") {
      return {
        subtotal,
        addOnPercentTotal,
        error: `${addOn.label} is Solo-only`,
      };
    }
    if ("duoOnly" in addOn && addOn.duoOnly && input.serviceType !== "duo") {
      return {
        subtotal,
        addOnPercentTotal,
        error: `${addOn.label} is Duo-only`,
      };
    }
    if ("game" in addOn && addOn.game && addOn.game !== input.game) {
      return {
        subtotal,
        addOnPercentTotal,
        error: `${addOn.label} is not available for this game`,
      };
    }
    addOnPercentTotal += addOn.percent;
    const bump = next * (addOn.percent / 100);
    lines.push({
      key: `addon:${key}`,
      label: addOn.label,
      amountUsdCents: roundCents(bump),
    });
    next += bump;
  }
  return { subtotal: next, addOnPercentTotal };
}

function finishQuote(
  input: QuoteInput,
  sku: SkuDefinition,
  lines: QuoteLine[],
  subtotal: number,
  divisions: number,
  addOnPercentTotal: number,
  startRankKey: string,
  endRankKey: string,
): PriceQuote {
  const amountUsdCents = roundCents(subtotal);
  const eurPerUsd = input.eurPerUsd ?? 0.92;
  const amountEurCents = roundCents(amountUsdCents * eurPerUsd);
  const displayCurrency = input.displayCurrency ?? "USD";
  const displayAmountCents =
    displayCurrency === "EUR" ? amountEurCents : amountUsdCents;

  return {
    ok: true,
    game: input.game,
    serviceType: input.serviceType,
    skuSlug: sku.slug,
    skuKind: sku.kind,
    startRankKey,
    endRankKey,
    divisions,
    amountUsdCents,
    amountEurCents,
    displayCurrency,
    displayAmountCents,
    lines,
    addOnPercentTotal,
    contractorShareUsdCents: contractorShareCents(amountUsdCents),
  };
}

function quoteRankClimb(
  input: QuoteInput,
  sku: Extract<SkuDefinition, { kind: "rank_climb" }>,
): QuoteResult {
  const catalog = getCatalog(input.game);
  let startIdx: number;
  let endIdx: number;
  try {
    startIdx = rankIndex(input.game, input.startRankKey);
    endIdx = rankIndex(input.game, input.endRankKey);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid rank" };
  }

  if (endIdx <= startIdx) {
    return { ok: false, error: "Desired rank must be higher than current rank" };
  }

  if (!catalog.servers.some((s) => s.key === input.server)) {
    return { ok: false, error: "Invalid server" };
  }
  if (!catalog.queues.some((q) => q.key === input.queue)) {
    return { ok: false, error: "Invalid queue" };
  }

  if (sku.roleKey && input.queue !== sku.roleKey) {
    // allow queue to drive role; sku role is advisory when queue matches OW roles
  }

  const lines: QuoteLine[] = [];
  let climbCents = 0;
  for (let i = startIdx; i < endIdx; i++) {
    const from = catalog.ranks[i]!;
    const step = catalog.baseStepUsdCents * from.weight;
    climbCents += step;
    lines.push({
      key: `step:${from.key}`,
      label: `${from.label} →`,
      amountUsdCents: roundCents(step),
    });
  }

  let subtotal = climbCents;

  const usesLp =
    input.game === "lol" || input.game === "valorant";
  if (usesLp) {
    const lpBand = LP_BANDS.find((b) => b.key === (input.currentLpBand ?? "21_40"));
    const gainBand = LP_GAIN_BANDS.find(
      (b) => b.key === (input.lpGainBand ?? "25_29"),
    );
    const lpFactor = (lpBand?.factor ?? 1) * (gainBand?.factor ?? 1);
    if (lpFactor !== 1) {
      const before = subtotal;
      subtotal *= lpFactor;
      lines.push({
        key: "lp_adjust",
        label: "LP / gain adjust",
        amountUsdCents: roundCents(subtotal - before),
      });
    }
  }

  const serviceMult = SERVICE_MULTIPLIER[input.serviceType];
  if (serviceMult !== 1) {
    const before = subtotal;
    subtotal *= serviceMult;
    lines.push({
      key: "service",
      label: input.serviceType === "duo" ? "Duo premium" : "Service",
      amountUsdCents: roundCents(subtotal - before),
    });
  }

  const addOns = applyAddOns(subtotal, lines, input);
  if (addOns.error) return { ok: false, error: addOns.error };

  return finishQuote(
    input,
    sku,
    lines,
    addOns.subtotal,
    endIdx - startIdx,
    addOns.addOnPercentTotal,
    input.startRankKey,
    input.endRankKey,
  );
}

function quoteUnitFarm(
  input: QuoteInput,
  sku: Extract<SkuDefinition, { kind: "unit_farm" }>,
): QuoteResult {
  if (sku.delivery !== "either" && sku.delivery !== input.serviceType) {
    return {
      ok: false,
      error: `${sku.label} requires ${sku.delivery} delivery`,
    };
  }
  const unitKey = input.skuPayload?.unitKey ?? sku.units[0]?.key;
  const unit = sku.units.find((u) => u.key === unitKey);
  if (!unit) return { ok: false, error: "Invalid farm unit" };

  const qty = Math.max(1, input.skuPayload?.quantity ?? 1);
  const lines: QuoteLine[] = [];
  let subtotal = sku.unitUsdCents * (unit.multiplier ?? 1) * qty;
  lines.push({
    key: `unit:${unit.key}`,
    label: `${unit.label}${qty > 1 ? ` ×${qty}` : ""}`,
    amountUsdCents: roundCents(subtotal),
  });

  if (input.serviceType === "duo") {
    const before = subtotal;
    subtotal *= SERVICE_MULTIPLIER.duo;
    lines.push({
      key: "service",
      label: "Duo premium",
      amountUsdCents: roundCents(subtotal - before),
    });
  }

  const addOns = applyAddOns(subtotal, lines, input);
  if (addOns.error) return { ok: false, error: addOns.error };

  return finishQuote(
    input,
    sku,
    lines,
    addOns.subtotal,
    qty,
    addOns.addOnPercentTotal,
    unit.key,
    unit.key,
  );
}

function quoteProgressBand(
  input: QuoteInput,
  sku: Extract<SkuDefinition, { kind: "progress_band" }>,
): QuoteResult {
  if (sku.delivery !== "either" && sku.delivery !== input.serviceType) {
    return {
      ok: false,
      error: `${sku.label} requires ${sku.delivery} delivery`,
    };
  }
  const start = input.skuPayload?.startLevel ?? sku.minLevel;
  const end = input.skuPayload?.endLevel ?? Math.min(sku.minLevel + 20, sku.maxLevel);
  if (start < sku.minLevel || end > sku.maxLevel || end <= start) {
    return { ok: false, error: "Invalid level range" };
  }

  const levels = end - start;
  const lines: QuoteLine[] = [];
  let subtotal = levels * sku.centsPerLevel;
  lines.push({
    key: "levels",
    label: `Level ${start} → ${end} (${levels})`,
    amountUsdCents: roundCents(subtotal),
  });

  const addOns = applyAddOns(subtotal, lines, input);
  if (addOns.error) return { ok: false, error: addOns.error };

  return finishQuote(
    input,
    sku,
    lines,
    addOns.subtotal,
    levels,
    addOns.addOnPercentTotal,
    String(start),
    String(end),
  );
}

function quoteFixedPackage(
  input: QuoteInput,
  sku: Extract<SkuDefinition, { kind: "fixed_package" }>,
): QuoteResult {
  if (sku.delivery !== "either" && sku.delivery !== input.serviceType) {
    return {
      ok: false,
      error: `${sku.label} requires ${sku.delivery} delivery`,
    };
  }
  const lines: QuoteLine[] = [
    {
      key: "package",
      label: sku.label,
      amountUsdCents: sku.amountUsdCents,
    },
  ];
  let subtotal = sku.amountUsdCents;
  const addOns = applyAddOns(subtotal, lines, input);
  if (addOns.error) return { ok: false, error: addOns.error };

  return finishQuote(
    input,
    sku,
    lines,
    addOns.subtotal,
    1,
    addOns.addOnPercentTotal,
    "package",
    "package",
  );
}

/**
 * Pure pricing dispatcher. Ledger currency is always USD; EUR is display only.
 */
export function quotePrice(input: QuoteInput): QuoteResult {
  const slug =
    input.skuSlug ??
    ({
      lol: "lol_rank",
      valorant: "valorant_rank",
      overwatch: "overwatch_rank_tank",
      marvel_rivals: "marvel_rivals_rank",
      apex: "apex_rank",
    }[input.game] as string);

  const sku = getSku(slug);
  if (!sku) return { ok: false, error: `Unknown SKU: ${slug}` };
  if (sku.game !== input.game) {
    return { ok: false, error: "SKU does not match game" };
  }

  switch (sku.kind) {
    case "rank_climb":
      return quoteRankClimb(input, sku);
    case "unit_farm":
      return quoteUnitFarm(input, sku);
    case "progress_band":
      return quoteProgressBand(input, sku);
    case "fixed_package":
      return quoteFixedPackage(input, sku);
    default:
      return { ok: false, error: "Unsupported SKU kind" };
  }
}

export function formatMoney(cents: number, currency: DisplayCurrency): string {
  return new Intl.NumberFormat(currency === "EUR" ? "de-DE" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
