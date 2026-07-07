export interface MarketOdds {
  type: string;
  outcomes: Record<string, number>;
}

export interface MarketProbability {
  type: string;
  outcomes: Record<string, number>;
}

export interface ConsistencyCheckResult {
  fixtureId: string;
  marketSet: string[];
  summedImpliedProbability: number;
  isConsistent: boolean;
  margin: number;
  optimalStakes: Record<string, Record<string, number>> | null;
  oddsSnapshotHash: string;
  txlineProofRef: string | null;
}

export interface MarketCoverage {
  markets: string[];
  totalImpliedProbability: number;
  isComplete: boolean;
}

export const MARKET_CATEGORIES: Record<string, string[]> = {
  match_winner: ['home', 'draw', 'away'],
  double_chance: ['1X', '12', '2X'],
  over_under_0_5: ['over', 'under'],
  over_under_1_5: ['over', 'under'],
  over_under_2_5: ['over', 'under'],
  over_under_3_5: ['over', 'under'],
  over_under_4_5: ['over', 'under'],
  both_teams_score: ['yes', 'no'],
  correct_score: [],
};

export const COVERING_SETS: string[][] = [
  ['match_winner'],
  ['double_chance'],
  ['over_under_0_5'],
  ['over_under_1_5'],
  ['over_under_2_5'],
  ['over_under_3_5'],
  ['over_under_4_5'],
  ['both_teams_score'],
];

export const SINGLE_OUTCOME_SETS: string[][] = [
  ['match_winner'],
  ['double_chance'],
  ['both_teams_score'],
];
