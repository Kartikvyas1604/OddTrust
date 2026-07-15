/**
 * OracleClient — on-chain submission to the OddsTrust Anchor program.
 *
 * When SOLANA_ORACLE_PROGRAM_ID is not set, the client operates in SIMULATION
 * mode: no transaction is built or sent, but the submission is fully logged
 * so the ingestion pipeline still stores results. Simulation signatures are
 * prefixed with "sim:" so they are never confused with real signatures.
 *
 * When SOLANA_ORACLE_PROGRAM_ID is set, the client:
 *  1. Derives the OracleConfig PDA and FixtureTrust PDA deterministically.
 *  2. Builds a Versioned Transaction (v0) encoding the Anchor submit_check ix.
 *  3. Signs it with the configured SOLANA_PAYER_KEY keypair.
 *  4. Sends it to the configured SOLANA_RPC_URL and returns the signature.
 */

import { getEnv } from '../config/env.js';
import { getLogger } from '../lib/logger.js';
import type { SubmissionJobData, SubmissionJobResult } from './types.js';
import crypto from 'node:crypto';

// ---- Constants matching the on-chain program ----------------------------------------

const ORACLE_CONFIG_SEED = Buffer.from('config');
const FIXTURE_TRUST_SEED = Buffer.from('fixture');

// Anchor discriminator for the `submit_check` instruction.
// Computed as SHA-256("global:submit_check")[0..8]
const SUBMIT_CHECK_DISCRIMINATOR = crypto
  .createHash('sha256')
  .update('global:submit_check')
  .digest()
  .subarray(0, 8);

// ---- Utility helpers ----------------------------------------------------------------

/**
 * Derives a deterministic 32-byte fixture ID from a human-readable string.
 * Must match the derivation in the on-chain program.
 */
function fixtureIdToBytes(fixtureId: string): Buffer {
  return crypto.createHash('sha256').update(fixtureId, 'utf8').digest();
}

/**
 * Derives a deterministic 32-byte proof ref from a string or UUID.
 * If the input is already 32 bytes (hex), decode it directly.
 * Otherwise SHA-256 hash it.
 */
function proofRefToBytes(ref: string | null): Buffer {
  if (!ref) return Buffer.alloc(32);
  const plain = Buffer.from(ref.replace(/-/g, ''), 'hex');
  if (plain.length === 32) return plain;
  return crypto.createHash('sha256').update(ref, 'utf8').digest();
}

/** Clamp a decimal margin to an i32 bps value in [-10000, 10000]. */
function marginToBps(margin: number): number {
  return Math.max(-10000, Math.min(10000, Math.round(margin * 10000)));
}

/**
 * Decode a Solana keypair from:
 *  - JSON array of 64 bytes (Solana CLI format): "[34,56,...]"
 *  - Base58 encoded 64-byte secret key
 *  - Hex encoded 64-byte secret key
 */
async function decodeKeypairBytes(raw: string): Promise<Uint8Array> {
  const trimmed = raw.trim();

  // JSON array format (Solana CLI)
  if (trimmed.startsWith('[')) {
    const arr = JSON.parse(trimmed) as number[];
    return new Uint8Array(arr);
  }

  // Hex (128 chars)
  if (/^[0-9a-fA-F]{128}$/.test(trimmed)) {
    return Uint8Array.from(Buffer.from(trimmed, 'hex'));
  }

  // @ts-ignore
  const bs58 = (await import('bs58')).default;
  return bs58.decode(trimmed);
}

// ---- PDA derivation -----------------------------------------------------------------

/**
 * Derive a program-derived address synchronously using the same logic as
 * `findProgramAddressSync` from @solana/web3.js v1 / @coral-xyz/anchor.
 *
 * We implement this directly to avoid pulling in the full Anchor package as
 * a runtime dependency of the backend worker.
 */
async function findProgramAddress(
  seeds: Buffer[],
  programId: Buffer,
): Promise<{ address: Buffer; bump: number }> {
  const { getProgramDerivedAddress } = await import(
    '@solana/addresses'
  ) as unknown as {
    getProgramDerivedAddress: (opts: { programAddress: string; seeds: ReadonlyArray<Uint8Array> }) => Promise<string>;
  };

  // @ts-ignore
  const bs58 = (await import('bs58')).default;
  const programAddress = bs58.encode(programId);

  for (let bump = 255; bump >= 0; bump--) {
    try {
      const bumpSeed = Buffer.from([bump]);
      const allSeeds: ReadonlyArray<Uint8Array> = [...seeds.map(s => new Uint8Array(s)), new Uint8Array(bumpSeed)];
      const pdaAddress = await getProgramDerivedAddress({ programAddress, seeds: allSeeds });
      return { address: Buffer.from(bs58.decode(pdaAddress)), bump };
    } catch {
      // Not a valid PDA — try next bump
    }
  }
  throw new Error('Could not find valid PDA bump');
}

// ---- OracleClient -------------------------------------------------------------------

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
      // ── SIMULATION MODE ───────────────────────────────────────────────
      // SOLANA_ORACLE_PROGRAM_ID is not configured. Log the result but
      // do not submit any transaction. The "sim:" prefix makes it
      // unambiguous that this is not a real on-chain signature.
      const simSig = `sim:${data.checkId.replace(/-/g, '').slice(0, 32)}`;
      log.warn(
        {
          fixtureId: data.fixtureId,
          isConsistent: data.isConsistent,
          margin: data.margin,
          signature: simSig,
        },
        'Oracle SIMULATION MODE — SOLANA_ORACLE_PROGRAM_ID not set; no on-chain tx submitted',
      );
      return { signature: simSig, slot: 0, blockTime: Math.floor(Date.now() / 1000) };
    }

    // ── LIVE ON-CHAIN SUBMISSION ──────────────────────────────────────────
    const payerKeyRaw = getEnv().SOLANA_PAYER_KEY;
    if (!payerKeyRaw) {
      throw new Error('SOLANA_PAYER_KEY is required when SOLANA_ORACLE_PROGRAM_ID is set');
    }

    const {
      createKeyPairSignerFromBytes,
      createSolanaRpc,
      createTransactionMessage,
      setTransactionMessageFeePayerSigner,
      setTransactionMessageLifetimeUsingBlockhash,
      appendTransactionMessageInstruction,
      signTransactionMessageWithSigners,
      getBase64EncodedWireTransaction,
      getSignatureFromTransaction,
      address: solanaAddress,
    } = await import('@solana/web3.js');

    const rpc = createSolanaRpc(getEnv().SOLANA_RPC_URL);

    // Decode the payer keypair
    const payerBytes = await decodeKeypairBytes(payerKeyRaw);
    const payerSigner = await createKeyPairSignerFromBytes(payerBytes);

    const programAddress = solanaAddress(this.programId!);

    // Derive program accounts
    // @ts-ignore
    const bs58 = (await import('bs58')).default;
    const programIdBytes = Buffer.from(bs58.decode(this.programId!));

    const { address: configPda } = await findProgramAddress([ORACLE_CONFIG_SEED], programIdBytes);
    const fixtureIdBytes = fixtureIdToBytes(data.fixtureId);
    const { address: fixtureTrustPda } = await findProgramAddress([FIXTURE_TRUST_SEED, fixtureIdBytes], programIdBytes);

    const configAddress = solanaAddress(bs58.encode(configPda));
    const fixtureTrustAddress = solanaAddress(bs58.encode(fixtureTrustPda));

    // Build the submit_check instruction data:
    //   [0..8]   discriminator (8 bytes)
    //   [8..40]  fixture_id   ([u8; 32])
    //   [40]     is_consistent (bool → u8)
    //   [41..45] margin_bps   (i32 LE)
    //   [45..77] txline_proof_ref ([u8; 32])
    //   Total: 77 bytes
    const proofRefBytes = proofRefToBytes(data.checkId);
    const marginBps = marginToBps(data.margin);

    const ixData = Buffer.alloc(77);
    SUBMIT_CHECK_DISCRIMINATOR.copy(ixData, 0);
    fixtureIdBytes.copy(ixData, 8);
    ixData.writeUInt8(data.isConsistent ? 1 : 0, 40);
    ixData.writeInt32LE(marginBps, 41);
    proofRefBytes.copy(ixData, 45);

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    // Build accounts in the order Anchor expects for SubmitCheck:
    // 0: config        (readonly)
    // 1: backend_signer (mut, signer)
    // 2: fixture_trust  (mut, init_if_needed)
    // 3: system_program (readonly)
    const SYSTEM_PROGRAM = solanaAddress('11111111111111111111111111111111');

    const instruction = {
      programAddress,
      accounts: [
        { address: configAddress, role: 2 /* readonly */ },
        { address: payerSigner.address, role: 3 /* writable signer */, signer: payerSigner },
        { address: fixtureTrustAddress, role: 1 /* writable */ },
        { address: SYSTEM_PROGRAM, role: 0 /* readonly */ },
      ],
      data: new Uint8Array(ixData),
    } as Parameters<typeof appendTransactionMessageInstruction>[0];

    const txMsg = appendTransactionMessageInstruction(
      instruction,
      setTransactionMessageLifetimeUsingBlockhash(
        latestBlockhash,
        setTransactionMessageFeePayerSigner(
          payerSigner,
          createTransactionMessage({ version: 0 }),
        ),
      ),
    );

    const signedTx = await signTransactionMessageWithSigners(txMsg);
    const wireTransaction = getBase64EncodedWireTransaction(signedTx);
    const txSignature = getSignatureFromTransaction(signedTx);

    // Pre-flight simulation
    const { value: simResult } = await rpc
      .simulateTransaction(wireTransaction, { encoding: 'base64' })
      .send();

    if (simResult.err) {
      throw new Error(`On-chain simulation failed before send: ${JSON.stringify(simResult.err)}`);
    }

    // In v2, context.slot might not be directly in simResult in all cases. Let's use 0 if not present.
    const slot = (simResult as any).context?.slot ?? 0;

    // Actual submission
    await rpc.sendTransaction(wireTransaction, { encoding: 'base64', skipPreflight: false }).send();

    log.info(
      { signature: txSignature, slot, fixtureId: data.fixtureId, marginBps },
      'On-chain submit_check sent',
    );

    return {
      signature: txSignature,
      slot,
      blockTime: Math.floor(Date.now() / 1000),
    };
  }
}
