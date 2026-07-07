import type { MarketOdds, MarketProbability } from './types.js';

export function computeImpliedProbability(odds: number): number {
  if (odds <= 1) return 1;
  return 1 / odds;
}

export function oddsToProbability(market: MarketOdds): MarketProbability {
  const outcomes: Record<string, number> = {};
  for (const [outcome, odd] of Object.entries(market.outcomes)) {
    outcomes[outcome] = computeImpliedProbability(odd);
  }
  return { type: market.type, outcomes };
}

export function normalizeMargin(probabilities: Record<string, number>): Record<string, number> {
  const total = Object.values(probabilities).reduce((s, p) => s + p, 0);
  if (total <= 0) return probabilities;
  const normalized: Record<string, number> = {};
  for (const [outcome, prob] of Object.entries(probabilities)) {
    normalized[outcome] = prob / total;
  }
  return normalized;
}

export function getBookmakerMargin(probabilities: Record<string, number>): number {
  return Object.values(probabilities).reduce((s, p) => s + p, 0) - 1;
}

export function allMarketsCovered(availableMarkets: string[], requiredSet: string[]): boolean {
  return requiredSet.every((m) => availableMarkets.includes(m));
}
