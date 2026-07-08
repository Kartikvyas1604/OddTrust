export interface SubmissionJobData {
  checkId: string;
  fixtureId: string;
  marketSet: string[];
  summedImpliedProbability: number;
  isConsistent: boolean;
  margin: number;
}

export interface SubmissionJobResult {
  signature: string;
  slot: number;
  blockTime: number | null;
}

export interface TxLINEAuthResponse {
  token: string;
  expires_at: string;
}

export interface TxLINESubscribeResponse {
  subscription_id: string;
  api_token: string;
}

export interface TxLINEFixture {
  id: string;
  sport_id: number;
  competition_id: string;
  season_id: string;
  home_team: string;
  away_team: string;
  start_time: string;
  status: string;
  home_score?: number;
  away_score?: number;
}

export interface TxLINEOddsMarket {
  type: string;
  odds: Record<string, number>;
  last_update: string;
  proof_ref?: string;
}

export interface TxLINEFixtureOdds {
  fixture_id: string;
  markets: TxLINEOddsMarket[];
  snapshot_hash: string;
  timestamp: string;
}

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

export const MARKET_CATEGORIES: Record<string, string[]> = {
  'match_winner': ['home', 'draw', 'away'],
  'double_chance': ['1X', '12', '2X'],
  'over_under_0.5': ['over', 'under'],
  'over_under_1.5': ['over', 'under'],
  'over_under_2.5': ['over', 'under'],
  'over_under_3.5': ['over', 'under'],
  'over_under_4.5': ['over', 'under'],
  'both_teams_score': ['yes', 'no'],
  'correct_score': [],
};

export const COVERING_SETS: string[][] = [
  ['match_winner'],
  ['double_chance'],
  ['over_under_0.5'],
  ['over_under_1.5'],
  ['over_under_2.5'],
  ['over_under_3.5'],
  ['over_under_4.5'],
  ['both_teams_score'],
];

export const SINGLE_OUTCOME_SETS: string[][] = [
  ['match_winner'],
  ['double_chance'],
  ['both_teams_score'],
];

export interface TxLINEHistoricalQuery {
  fixture_id: string;
  from?: string;
  to?: string;
}
