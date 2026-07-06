import type { z } from 'zod';

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

export interface TxLINEStreamMessage {
  type: 'odds_update' | 'score_update' | 'status_change' | 'heartbeat';
  fixture_id: string;
  data: unknown;
  timestamp: string;
}

export interface TxLINEHistoricalQuery {
  fixture_id: string;
  from?: string;
  to?: string;
}
