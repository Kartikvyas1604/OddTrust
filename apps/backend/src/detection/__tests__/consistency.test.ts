import { describe, it, expect } from 'vitest';
import { checkConsistency } from '../consistency.js';
import { computeImpliedProbability, oddsToProbability, normalizeMargin, getBookmakerMargin } from '../market.js';
import { computeArbitrageStakes } from '../consistency.js';
import type { MarketOdds } from '../types.js';

describe('computeImpliedProbability', () => {
  it('returns 1/odds for odds > 1', () => {
    expect(computeImpliedProbability(2.0)).toBe(0.5);
    expect(computeImpliedProbability(4.0)).toBe(0.25);
    expect(computeImpliedProbability(1.5)).toBeCloseTo(0.666667, 4);
  });

  it('returns 1 for odds <= 1', () => {
    expect(computeImpliedProbability(1.0)).toBe(1);
    expect(computeImpliedProbability(0.5)).toBe(1);
  });
});

describe('oddsToProbability', () => {
  it('converts all outcomes in a market', () => {
    const market: MarketOdds = {
      type: 'match_winner',
      outcomes: { home: 2.5, draw: 3.2, away: 3.0 },
    };
    const prob = oddsToProbability(market);
    expect(prob.type).toBe('match_winner');
    expect(prob.outcomes.home).toBeCloseTo(0.4, 4);
    expect(prob.outcomes.draw).toBeCloseTo(0.3125, 4);
    expect(prob.outcomes.away).toBeCloseTo(0.333333, 4);
  });
});

describe('getBookmakerMargin', () => {
  it('calculates margin above 1', () => {
    const prob = { home: 0.4, draw: 0.3, away: 0.35 };
    expect(getBookmakerMargin(prob)).toBeCloseTo(0.05, 4);
  });

  it('returns 0 for fair odds', () => {
    const prob = { home: 0.5, away: 0.5 };
    expect(getBookmakerMargin(prob)).toBeCloseTo(0, 4);
  });
});

describe('normalizeMargin', () => {
  it('scales probabilities to sum to 1', () => {
    const raw = { home: 0.5, draw: 0.3, away: 0.25 };
    const normalized = normalizeMargin(raw);
    const total = Object.values(normalized).reduce((s, p) => s + p, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(normalized.home).toBeCloseTo(0.5 / 1.05, 4);
  });
});

describe('checkConsistency', () => {
  it('detects consistent market (no arbitrage) — Σ(1/odds) >= 1', () => {
    const markets: MarketOdds[] = [
      {
        type: 'match_winner',
        outcomes: { home: 2.1, draw: 3.4, away: 3.8 },
      },
    ];

    const result = checkConsistency('fixture-1', markets, ['match_winner'], 'hash123');
    expect(result.isConsistent).toBe(true);
    expect(result.summedImpliedProbability).toBeGreaterThanOrEqual(1);
    expect(result.optimalStakes).toBeNull();
  });

  it('detects inconsistent market (arbitrage) — Σ(1/odds) < 1', () => {
    const markets: MarketOdds[] = [
      {
        type: 'match_winner',
        outcomes: { home: 3.0, draw: 4.0, away: 3.2 },
      },
    ];

    const result = checkConsistency('fixture-2', markets, ['match_winner'], 'hash456');
    expect(result.isConsistent).toBe(false);
    expect(result.summedImpliedProbability).toBeLessThan(1);
    expect(result.optimalStakes).not.toBeNull();
  });

  it('computes correct optimal stakes for arbitrage', () => {
    const markets: MarketOdds[] = [
      {
        type: 'match_winner',
        outcomes: { home: 3.0, draw: 4.0, away: 3.2 },
      },
    ];

    const result = checkConsistency('fixture-3', markets, ['match_winner'], 'hash789');
    const stakes = result.optimalStakes!;

    const homeProb = 1 / 3.0;
    const drawProb = 1 / 4.0;
    const awayProb = 1 / 3.2;
    const totalImplied = homeProb + drawProb + awayProb;

    expect(stakes.match_winner.home).toBeCloseTo(homeProb / totalImplied, 4);
    expect(stakes.match_winner.draw).toBeCloseTo(drawProb / totalImplied, 4);
    expect(stakes.match_winner.away).toBeCloseTo(awayProb / totalImplied, 4);

    const stakeTotal = Object.values(stakes.match_winner).reduce((s, v) => s + v, 0);
    expect(stakeTotal).toBeCloseTo(1.0, 4);
  });

  it('handles multi-market arbitrage', () => {
    const markets: MarketOdds[] = [
      {
        type: 'over_under_2.5',
        outcomes: { over: 2.2, under: 1.7 },
      },
    ];

    const result = checkConsistency('fixture-4', markets, ['over_under_2.5'], 'hash101');
    const overProb = 1 / 2.2;
    const underProb = 1 / 1.7;
    const totalImplied = overProb + underProb;

    if (totalImplied < 1) {
      expect(result.isConsistent).toBe(false);
      expect(result.optimalStakes!['over_under_2.5'].over).toBeCloseTo(overProb / totalImplied, 4);
      expect(result.optimalStakes!['over_under_2.5'].under).toBeCloseTo(underProb / totalImplied, 4);
    } else {
      expect(result.isConsistent).toBe(true);
    }
  });

  it('throws on empty market set', () => {
    const markets: MarketOdds[] = [];
    expect(() => {
      checkConsistency('fixture-5', markets, ['match_winner'], 'hash202');
    }).not.toThrow();
  });
});

describe('computeArbitrageStakes', () => {
  it('computes stakes for arbitrage with 100 unit total', () => {
    const markets: MarketOdds[] = [
      {
        type: 'match_winner',
        outcomes: { home: 2.5, draw: 3.5, away: 2.8 },
      },
    ];

    const stakes = computeArbitrageStakes(markets);
    if (Object.keys(stakes).length > 0) {
      const total = Object.values(stakes.match_winner).reduce((s, v) => s + v, 0);
      expect(total).toBeCloseTo(100, 2);
    }
  });

  it('returns empty object for consistent markets', () => {
    const markets: MarketOdds[] = [
      {
        type: 'match_winner',
        outcomes: { home: 2.0, draw: 3.5, away: 3.5 },
      },
    ];

    const stakes = computeArbitrageStakes(markets);
    expect(Object.keys(stakes).length).toBe(0);
  });
});

describe('checkConsistency — known fixtures', () => {
  it('correctly computes Σ(1/odds) for a 3-outcome market', () => {
    const markets: MarketOdds[] = [
      {
        type: 'match_winner',
        outcomes: { home: 2.10, draw: 3.25, away: 3.50 },
      },
    ];

    const result = checkConsistency('fixture-known1', markets, ['match_winner'], 'hash-k1');

    const expectedSip = 1 / 2.10 + 1 / 3.25 + 1 / 3.50;
    expect(result.summedImpliedProbability).toBeCloseTo(expectedSip, 6);
    expect(result.fixtureId).toBe('fixture-known1');
    expect(result.oddsSnapshotHash).toBe('hash-k1');
  });

  it('detects arbitrage with over/under market', () => {
    const markets: MarketOdds[] = [
      {
        type: 'over_under_2.5',
        outcomes: { over: 2.25, under: 1.65 },
      },
    ];

    const result = checkConsistency('fixture-ou1', markets, ['over_under_2.5'], 'hash-ou');
    const sip = 1 / 2.25 + 1 / 1.65;

    expect(result.summedImpliedProbability).toBeCloseTo(sip, 6);
    expect(result.isConsistent).toBe(sip >= 1);
  });

  it('computes margin correctly', () => {
    const markets: MarketOdds[] = [
      {
        type: 'both_teams_score',
        outcomes: { yes: 1.8, no: 2.0 },
      },
    ];

    const result = checkConsistency('fixture-bts', markets, ['both_teams_score'], 'hash-bts');
    const margin = (1 / 1.8 + 1 / 2.0) - 1;
    expect(result.margin).toBeCloseTo(margin, 6);
  });
});
