import { getEnv } from '../config';
import { getLogger } from '../logger';
import type { SubmissionJobData, SubmissionJobResult } from './types';

import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import idl from './idl.json';

const PROGRAM_ID = new web3.PublicKey(idl.address);
const ORACLE_CONFIG_SEED = Buffer.from([99, 111, 110, 102, 105, 103]);
const FIXTURE_TRUST_SEED = Buffer.from([102, 105, 120, 116, 117, 114, 101]);

function findConfigPda(): [web3.PublicKey, number] {
  return web3.PublicKey.findProgramAddressSync([ORACLE_CONFIG_SEED], PROGRAM_ID);
}

function findFixtureTrustPda(fixtureId: Uint8Array): [web3.PublicKey, number] {
  return web3.PublicKey.findProgramAddressSync([FIXTURE_TRUST_SEED, fixtureId], PROGRAM_ID);
}

function hashTo32Bytes(input: string): Uint8Array {
  const encoded = new TextEncoder().encode(input);
  const out = new Uint8Array(32).fill(0);
  out.set(encoded.slice(0, 32));
  return out;
}

export class OracleClient {
  private program: Program | null = null;
  private payer: web3.Keypair | null = null;
  private connection: web3.Connection | null = null;

  constructor() {
    const env = getEnv();
    const payerKeyRaw = env.SOLANA_PAYER_KEY;
    const programId = env.SOLANA_ORACLE_PROGRAM_ID;

    if (!payerKeyRaw || !programId) return;

    try {
      let secret: Uint8Array;
      try {
        secret = Uint8Array.from(JSON.parse(payerKeyRaw));
      } catch {
        const { decode: b58decode } = require('bs58') as { decode: (s: string) => Uint8Array };
        secret = b58decode(payerKeyRaw);
      }

      if (secret.length === 64) {
        this.payer = web3.Keypair.fromSecretKey(secret);
      } else if (secret.length === 32) {
        this.payer = web3.Keypair.fromSeed(secret);
      } else {
        throw new Error(`Invalid key length: ${secret.length}`);
      }

      this.connection = new web3.Connection(env.SOLANA_RPC_URL, 'confirmed');
      const wallet = {
        publicKey: this.payer.publicKey,
        signTransaction: async (tx: web3.Transaction) => { tx.sign(this.payer!); return tx; },
        signAllTransactions: async (txs: web3.Transaction[]) => { txs.forEach((tx) => tx.sign(this.payer!)); return txs; },
      };
      const provider = new AnchorProvider(this.connection, wallet as any, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      });
      this.program = new Program(idl as never, provider);
    } catch (err) {
      getLogger().warn({ err }, 'Oracle client initialization failed');
    }
  }

  get isConfigured(): boolean {
    return this.program !== null && this.payer !== null && this.connection !== null;
  }

  async submitConsistencyCheck(data: SubmissionJobData): Promise<SubmissionJobResult> {
    const log = getLogger();

    if (!this.isConfigured || !this.program || !this.payer || !this.connection) {
      log.warn({ fixtureId: data.fixtureId }, 'Oracle not configured; logging check only');
      return { signature: 'unsubmitted', slot: 0, blockTime: Math.floor(Date.now() / 1000) };
    }

    log.info({ fixtureId: data.fixtureId, isConsistent: data.isConsistent }, 'Submitting to on-chain oracle');

    try {
      const fixtureId = hashTo32Bytes(data.fixtureId);
      const proofRef = hashTo32Bytes(`${data.fixtureId}_${Date.now()}`);
      const marginBps = Math.min(Math.max(Math.round(data.margin * 10000), -10000), 10000);
      const [configPda] = findConfigPda();
      const [fixturePda] = findFixtureTrustPda(fixtureId);

      const sig = await this.program.methods.submitCheck(
        Array.from(fixtureId),
        data.isConsistent,
        marginBps,
        Array.from(proofRef),
      )
        .accounts({
          config: configPda,
          backendSigner: this.payer.publicKey,
          fixtureTrust: fixturePda,
          systemProgram: web3.PublicKey.default,
        })
        .rpc();

      const slot = await this.connection.getSlot().catch(() => 0);
      const blockTime = await this.connection.getBlockTime(slot).catch(() => null);

      log.info({ signature: sig, slot, fixtureId: data.fixtureId }, 'On-chain submission confirmed');

      return { signature: sig, slot, blockTime };
    } catch (err) {
      log.error({ err, fixtureId: data.fixtureId }, 'On-chain submission failed');
      throw err;
    }
  }
}
