import type { MarketOdds, ConsistencyCheckResult } from './types.js';
import { oddsToProbability } from './market.js';

export function checkConsistency(
  fixtureId: string,
  markets: MarketOdds[],
  marketTypes: string[],
  oddsSnapshotHash: string,
  txlineProofRef: string | null = null,
): ConsistencyCheckResult {
  const selected = markets.filter((m) => marketTypes.includes(m.type));
  const probabilities = selected.map(oddsToProbability);

  let summedImpliedProbability = 0;
  const optimalStakes: Record<string, Record<string, number>> = {};

  for (const prob of probabilities) {
    for (const p of Object.values(prob.outcomes)) {
      summedImpliedProbability += p;
    }
  }

  const margin = summedImpliedProbability - 1;
  const isConsistent = summedImpliedProbability >= 1;

  if (!isConsistent) {
    const totalInverse = summedImpliedProbability;
    for (const prob of probabilities) {
      const marketStakes: Record<string, number> = {};
      for (const [outcome, impliedProb] of Object.entries(prob.outcomes)) {
        marketStakes[outcome] = impliedProb / totalInverse;
      }
      optimalStakes[prob.type] = marketStakes;
    }
  }

  return {
    fixtureId,
    marketSet: marketTypes,
    summedImpliedProbability: roundTo(summedImpliedProbability, 6),
    isConsistent,
    margin: roundTo(margin, 6),
    optimalStakes: isConsistent ? null : optimalStakes,
    oddsSnapshotHash,
    txlineProofRef,
  };
}

export function computeArbitrageStakes(
  markets: MarketOdds[],
  totalStake: number = 100,
): Record<string, Record<string, number>> {
  const probabilities = markets.map(oddsToProbability);
  let summed = 0;

  for (const prob of probabilities) {
    for (const p of Object.values(prob.outcomes)) {
      summed += p;
    }
  }

  if (summed >= 1) return {};

  const stakes: Record<string, Record<string, number>> = {};
  for (const prob of probabilities) {
    const marketStakes: Record<string, number> = {};
    for (const [outcome, impliedProb] of Object.entries(prob.outcomes)) {
      marketStakes[outcome] = roundTo((totalStake * impliedProb) / summed, 4);
    }
    stakes[prob.type] = marketStakes;
  }

  return stakes;
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
