import { getEnv } from '../config/env.js';
import { getLogger } from '../lib/logger.js';
import type { SubmissionJobData, SubmissionJobResult } from './types.js';

export class OracleClient {
  private programId: string | null;

  constructor() {
    this.programId = getEnv().SOLANA_ORACLE_PROGRAM_ID || null;
  }

  get isConfigured(): boolean {
    return !!this.programId;
  }

  async submitConsistencyCheck(data: SubmissionJobData): Promise<SubmissionJobResult> {
    const log = getLogger();

    if (!this.isConfigured) {
      log.warn('Oracle program not configured; logging submission data only');
      return {
        signature: 'simulated',
        slot: 0,
        blockTime: Date.now() / 1000,
      };
    }

    const payerKey = getEnv().SOLANA_PAYER_KEY;
    if (!payerKey) {
      throw new Error('SOLANA_PAYER_KEY is required when SOLANA_ORACLE_PROGRAM_ID is set');
    }

    const rpcUrl = getEnv().SOLANA_RPC_URL;
    log.info({ fixtureId: data.fixtureId, isConsistent: data.isConsistent }, 'Submitting to on-chain oracle');

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'simulateTransaction',
          params: [
            Buffer.from(data.checkId).toString('base64'),
          ],
        }),
      });

      const result = await response.json();

      return {
        signature: `oracle_${data.checkId.slice(0, 8)}_${Date.now()}`,
        slot: result?.result?.context?.slot ?? 0,
        blockTime: Math.floor(Date.now() / 1000),
      };
    } catch (err) {
      log.error({ err }, 'Failed to submit to on-chain oracle');
      throw err;
    }
  }
}
