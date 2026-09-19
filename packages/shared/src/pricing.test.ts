import { describe, expect, it } from "vitest";
import { quotePrice, contractorShareCents } from "./pricing";
import { CONTRACTOR_SHARE_BPS } from "./enums";

describe("quotePrice", () => {
  it("prices a short LoL climb in USD cents", () => {
    const q = quotePrice({
      game: "lol",
      serviceType: "solo",
      startRankKey: "silver_iv",
      endRankKey: "gold_iv",
      server: "euw",
      queue: "solo",
    });
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    expect(q.divisions).toBe(4);
    expect(q.amountUsdCents).toBeGreaterThan(3000);
    expect(q.amountEurCents).toBeLessThan(q.amountUsdCents);
    expect(q.contractorShareUsdCents).toBe(
      contractorShareCents(q.amountUsdCents),
    );
    expect(CONTRACTOR_SHARE_BPS).toBe(7500);
  });

  it("rejects equal or lower target", () => {
    const q = quotePrice({
      game: "valorant",
      serviceType: "duo",
      startRankKey: "gold_2",
      endRankKey: "gold_1",
      server: "eu",
      queue: "competitive",
    });
    expect(q.ok).toBe(false);
  });

  it("applies duo and priority add-on", () => {
    const base = quotePrice({
      game: "lol",
      serviceType: "solo",
      startRankKey: "gold_iv",
      endRankKey: "platinum_iv",
      server: "na",
      queue: "solo",
    });
    const duo = quotePrice({
      game: "lol",
      serviceType: "duo",
      startRankKey: "gold_iv",
      endRankKey: "platinum_iv",
      server: "na",
      queue: "solo",
      addOnKeys: ["priority"],
    });
    expect(base.ok && duo.ok).toBe(true);
    if (!base.ok || !duo.ok) return;
    expect(duo.amountUsdCents).toBeGreaterThan(base.amountUsdCents);
    expect(duo.addOnPercentTotal).toBe(25);
  });

  it("prices OW Bronze5 → Silver1 near $26", () => {
    const q = quotePrice({
      game: "overwatch",
      serviceType: "solo",
      startRankKey: "bronze_5",
      endRankKey: "silver_1",
      server: "eu",
      queue: "tank",
      skuSlug: "overwatch_rank_tank",
    });
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    expect(q.amountUsdCents).toBeGreaterThan(1800);
    expect(q.amountUsdCents).toBeLessThan(3200);
  });

  it("prices Marvel Lord farm", () => {
    const q = quotePrice({
      game: "marvel_rivals",
      serviceType: "solo",
      startRankKey: "n/a",
      endRankKey: "n/a",
      server: "pc",
      queue: "competitive",
      skuSlug: "marvel_lord",
      skuPayload: { unitKey: "duelist" },
    });
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    expect(q.amountUsdCents).toBe(7900);
    expect(q.skuKind).toBe("unit_farm");
  });

  it("prices Apex level band", () => {
    const q = quotePrice({
      game: "apex",
      serviceType: "solo",
      startRankKey: "n/a",
      endRankKey: "n/a",
      server: "pc",
      queue: "ranked",
      skuSlug: "apex_level",
      skuPayload: { startLevel: 1, endLevel: 21 },
    });
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    expect(q.amountUsdCents).toBe(20 * 45);
  });

  it("prices Apex ranked unlock fixed package", () => {
    const q = quotePrice({
      game: "apex",
      serviceType: "solo",
      startRankKey: "n/a",
      endRankKey: "n/a",
      server: "pc",
      queue: "ranked",
      skuSlug: "apex_ranked_unlock",
    });
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    expect(q.amountUsdCents).toBe(4200);
  });
});
