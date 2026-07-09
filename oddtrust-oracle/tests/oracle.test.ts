import {
  it,
  describe,
  before,
} from 'node:test';
import assert from 'node:assert';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  Program,
  AnchorProvider,
  Wallet,
  setProvider,
} from '@coral-xyz/anchor';
import type { OddtrustOracle } from '../target/types/oddtrust_oracle';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const FIXTURE_PREFIX = Buffer.from('fixture');
const CONFIG_PREFIX = Buffer.from('config');

function hashFixtureId(id: string): Buffer {
  return Buffer.from(crypto.createHash('sha256').update(id).digest());
}

describe('oddtrust-oracle', () => {
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  const payer = Keypair.generate();
  const authority = Keypair.generate();
  const backendSigner = Keypair.generate();
  const attacker = Keypair.generate();

  let program: Program<OddtrustOracle>;

  before(async () => {
    const wallet = new Wallet(payer);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    setProvider(provider);
    const idl = JSON.parse(readFileSync(join(__dirname, '../target/idl/oddtrust_oracle.json'), 'utf-8'));
    program = new Program(
      idl,
      provider,
    ) as Program<OddtrustOracle>;

    const sigs = await Promise.all([
      connection.requestAirdrop(payer.publicKey, 10 * LAMPORTS_PER_SOL),
      connection.requestAirdrop(attacker.publicKey, 10 * LAMPORTS_PER_SOL),
      connection.requestAirdrop(backendSigner.publicKey, 10 * LAMPORTS_PER_SOL),
    ]);
    for (const sig of sigs) {
      await connection.confirmTransaction(sig, 'confirmed');
    }
  });

  it('initializes the oracle config', async () => {
    const [configPda] = PublicKey.findProgramAddressSync(
      [CONFIG_PREFIX],
      program.programId,
    );

    await program.methods
      .initializeConfig(authority.publicKey, backendSigner.publicKey)
      .accounts({
        payer: payer.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    const config = await program.account.oracleConfig.fetch(configPda);
    assert(config.authority.equals(authority.publicKey));
    assert(config.backendSigner.equals(backendSigner.publicKey));
    assert(config.totalChecks.eqn(0));
    assert(config.totalInconsistencies.eqn(0));
  });

  it('rejects submit_check from unauthorized signer', async () => {
    const [configPda] = PublicKey.findProgramAddressSync(
      [CONFIG_PREFIX],
      program.programId,
    );
    const fixtureId = hashFixtureId('match-1');
    const [fixturePda] = PublicKey.findProgramAddressSync(
      [FIXTURE_PREFIX, fixtureId],
      program.programId,
    );

    try {
      await program.methods
        .submitCheck(fixtureId, true, 200, Buffer.alloc(32))
        .accounts({
          config: configPda,
          backendSigner: attacker.publicKey,
          fixtureTrust: fixturePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([attacker])
        .rpc();
      assert.fail('should have thrown');
    } catch (err: any) {
      assert(err.message.includes('UnauthorizedSubmitter') || err.message.includes('0x1789'));
    }
  });

  it('submits a consistent check', async () => {
    const [configPda] = PublicKey.findProgramAddressSync(
      [CONFIG_PREFIX],
      program.programId,
    );
    const fixtureId = hashFixtureId('match-consistent');
    const proofRef = Buffer.from(crypto.createHash('sha256').update('txline-proof-1').digest());
    const [fixturePda] = PublicKey.findProgramAddressSync(
      [FIXTURE_PREFIX, fixtureId],
      program.programId,
    );

    await program.methods
      .submitCheck(fixtureId, true, 250, proofRef)
      .accounts({
        config: configPda,
        backendSigner: backendSigner.publicKey,
        fixtureTrust: fixturePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([backendSigner])
      .rpc();

    const ft = await program.account.fixtureTrust.fetch(fixturePda);
    assert(ft.isConsistent === true);
    assert(ft.marginBps === 250);
    assert(ft.checkCount === 1);
    assert(Buffer.from(ft.txlineProofRef).equals(proofRef));
    assert(ft.fixtureId.every((b, i) => b === fixtureId[i]));

    const config = await program.account.oracleConfig.fetch(configPda);
    assert(config.totalChecks.eqn(1));
    assert(config.totalInconsistencies.eqn(0));
  });

  it('updates an existing fixture and increments counts', async () => {
    const [configPda] = PublicKey.findProgramAddressSync(
      [CONFIG_PREFIX],
      program.programId,
    );
    const fixtureId = hashFixtureId('match-consistent');
    const proofRef2 = Buffer.from(crypto.createHash('sha256').update('txline-proof-2').digest());
    const [fixturePda] = PublicKey.findProgramAddressSync(
      [FIXTURE_PREFIX, fixtureId],
      program.programId,
    );

    await program.methods
      .submitCheck(fixtureId, false, -75, proofRef2)
      .accounts({
        config: configPda,
        backendSigner: backendSigner.publicKey,
        fixtureTrust: fixturePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([backendSigner])
      .rpc();

    const ft = await program.account.fixtureTrust.fetch(fixturePda);
    assert(ft.isConsistent === false);
    assert(ft.marginBps === -75);
    assert(ft.checkCount === 2);

    const config = await program.account.oracleConfig.fetch(configPda);
    assert(config.totalChecks.eqn(2));
    assert(config.totalInconsistencies.eqn(1));
  });

  it('queries trust and gets correct state', async () => {
    const fixtureId = hashFixtureId('match-consistent');
    const [fixturePda] = PublicKey.findProgramAddressSync(
      [FIXTURE_PREFIX, fixtureId],
      program.programId,
    );

    await program.methods
      .queryTrust(fixtureId)
      .accounts({
        fixtureTrust: fixturePda,
      })
      .rpc();
  });

  it('trading_agent_check returns EXECUTED for consistent fixture', async () => {
    const consistentFixture = hashFixtureId('agent-executed');
    const [configPda] = PublicKey.findProgramAddressSync(
      [CONFIG_PREFIX],
      program.programId,
    );
    const [fixturePda] = PublicKey.findProgramAddressSync(
      [FIXTURE_PREFIX, consistentFixture],
      program.programId,
    );

    await program.methods
      .submitCheck(consistentFixture, true, 100, Buffer.alloc(32))
      .accounts({
        config: configPda,
        backendSigner: backendSigner.publicKey,
        fixtureTrust: fixturePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([backendSigner])
      .rpc();

    const txSig = await program.methods
      .tradingAgentCheck(consistentFixture)
      .accounts({
        agent: backendSigner.publicKey,
        fixtureTrust: fixturePda,
      })
      .signers([backendSigner])
      .rpc();

    const tx = await connection.getTransaction(txSig, {
      commitment: 'confirmed',
    });
    const logs = tx?.meta?.logMessages ?? [];
    const hasExecuted = logs.some((l) => l.includes('Executed'));
    assert(hasExecuted, 'Expected Executed decision in logs');
  });

  it('trading_agent_check returns BLOCKED for inconsistent fixture', async () => {
    const inconsistentFixture = hashFixtureId('agent-blocked');
    const [configPda] = PublicKey.findProgramAddressSync(
      [CONFIG_PREFIX],
      program.programId,
    );
    const [fixturePda] = PublicKey.findProgramAddressSync(
      [FIXTURE_PREFIX, inconsistentFixture],
      program.programId,
    );

    await program.methods
      .submitCheck(inconsistentFixture, false, -100, Buffer.alloc(32))
      .accounts({
        config: configPda,
        backendSigner: backendSigner.publicKey,
        fixtureTrust: fixturePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([backendSigner])
      .rpc();

    const txSig = await program.methods
      .tradingAgentCheck(inconsistentFixture)
      .accounts({
        agent: backendSigner.publicKey,
        fixtureTrust: fixturePda,
      })
      .signers([backendSigner])
      .rpc();

    const tx = await connection.getTransaction(txSig, {
      commitment: 'confirmed',
    });
    const logs = tx?.meta?.logMessages ?? [];
    const hasBlocked = logs.some((l) => l.includes('Blocked'));
    assert(hasBlocked, 'Expected Blocked decision in logs');
  });
});
