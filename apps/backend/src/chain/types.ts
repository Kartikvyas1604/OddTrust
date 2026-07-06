import type { Cluster } from '@solana/web3.js';

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

export interface OracleConfig {
  programId: string;
  cluster: Cluster;
  rpcUrl: string;
}
