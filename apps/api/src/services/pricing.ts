import {
  PLATFORM_COMMISSION_RATE,
  BOOSTER_EARNINGS_RATE,
  DEFAULT_CURRENCY,
} from '@hardstuck/shared';
import { Game } from '../models/Game';
import { Rank } from '../models/Rank';
import { Service } from '../models/Service';
import { PricingConfig } from '../models/PricingConfig';

export interface QuoteParams {
  gameId: string;
  serviceId: string;
  startRankId: string;
  endRankId: string;
  currency?: string;
  queueWaitDays?: number;
  boosterRating?: number;
  boosterCompletedOrders?: number;
}

export interface QuoteResult {
  currency: string;
  estimatedHours: number;
  basePrice: number;
  serviceMultiplier: number;
  totalPrice: number;
  platformCommission: number;
  boosterEarnings: number;
  startRankName: string;
  endRankName: string;
  breakdown: Record<string, number | string>;
}

function decimalToNumber(value: { toString(): string } | number | string): number {
  return Number(value.toString());
}

/** Rough hours estimate from rank order delta (BRD algorithm shell). */
function estimateHours(startOrder: number, endOrder: number): number {
  const delta = Math.max(endOrder - startOrder, 1);
  return Math.max(2, Math.round(delta * 1.5));
}

export async function calculatePriceQuote(params: QuoteParams): Promise<QuoteResult> {
  const [game, service, startRank, endRank] = await Promise.all([
    Game.findById(params.gameId),
    Service.findById(params.serviceId),
    Rank.findById(params.startRankId),
    Rank.findById(params.endRankId),
  ]);

  if (!game || !service || !startRank || !endRank) {
    throw new Error('Invalid game, service, or rank selection');
  }

  if (endRank.rankOrder <= startRank.rankOrder) {
    throw new Error('Desired rank must be higher than current rank');
  }

  const currency = (params.currency ?? DEFAULT_CURRENCY).toUpperCase();
  const pricing = await PricingConfig.findOne({ gameId: game._id });
  const adjustments = pricing?.adjustments ?? {
    queueWaitBonus: 0.1,
    lowRatingPenalty: 0.15,
    newBoosterDiscount: 0.2,
    peakHourBonus: 0.1,
  };

  const baseRate = decimalToNumber(game.basePrice);
  const difficultyMultiplier = endRank.difficultyMultiplier;
  const estimatedHours = estimateHours(startRank.rankOrder, endRank.rankOrder);
  let cost = baseRate * difficultyMultiplier * estimatedHours;
  cost *= service.priceMultiplier;

  if ((params.queueWaitDays ?? 0) > 2) {
    cost *= 1 + adjustments.queueWaitBonus;
  }
  if (params.boosterRating !== undefined && params.boosterRating < 4.0) {
    cost *= 1 - adjustments.lowRatingPenalty;
  }
  if (
    params.boosterCompletedOrders !== undefined &&
    params.boosterCompletedOrders < 10
  ) {
    cost *= 1 - adjustments.newBoosterDiscount;
  }

  const hour = new Date().getUTCHours();
  if (hour >= 18 || hour < 2) {
    cost *= 1 + adjustments.peakHourBonus;
  }

  const totalPrice = Math.round(cost * 100) / 100;
  const platformCommission =
    Math.round(totalPrice * PLATFORM_COMMISSION_RATE * 100) / 100;
  const boosterEarnings =
    Math.round(totalPrice * BOOSTER_EARNINGS_RATE * 100) / 100;

  return {
    currency,
    estimatedHours,
    basePrice: Math.round(baseRate * difficultyMultiplier * estimatedHours * 100) / 100,
    serviceMultiplier: service.priceMultiplier,
    totalPrice,
    platformCommission,
    boosterEarnings,
    startRankName: `${startRank.name}${startRank.division ? ` ${startRank.division}` : ''}`,
    endRankName: `${endRank.name}${endRank.division ? ` ${endRank.division}` : ''}`,
    breakdown: {
      baseRate,
      difficultyMultiplier,
      estimatedHours,
      serviceMultiplier: service.priceMultiplier,
      currency,
    },
  };
}
