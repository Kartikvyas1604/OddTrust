/**
 * OddsTrust Demo Script
 *
 * Run: `anchor run demo`
 *
 * What it does:
 * 1. Initializes the oracle config on devnet
 * 2. Submits a consistent check (EXECUTED path)
 * 3. Submits an inconsistent check (BLOCKED path)
 * 4. Demonstrates both trading_agent_check decisions
 * 5. Outputs transaction signatures for Solana Explorer verification
 */
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
  BN,
} from '@coral-xyz/anchor';
import type { OddtrustOracle } from '../target/types/oddtrust_oracle';
import crypto from 'node:crypto';

const CLUSTER = 'devnet';
const RPC_URL = 'https://api.devnet.solana.com';
const EXPLORER_TX = `https://explorer.solana.com/tx/{sig}?cluster=${CLUSTER}`;
const EXPLORER_ACCOUNT = `https://explorer.solana.com/address/{addr}?cluster=${CLUSTER}`;

function hash(s: string): Buffer {
  return Buffer.from(crypto.createHash('sha256').update(s).digest());
}

async function main() {
  console.log(`\n🧪 OddsTrust Demo — ${CLUSTER}\n`);

  const connection = new Connection(RPC_URL, 'confirmed');
  const payer = Keypair.generate();
  const authority = Keypair.generate();
  const backendSigner = Keypair.generate();

  console.log('   Payer:', payer.publicKey.toBase58());
  console.log('   Authority:', authority.publicKey.toBase58());
  console.log('   Backend Signer:', backendSigner.publicKey.toBase58());
  console.log('   Program ID:', require('../target/idl/oddtrust_oracle.json').address);
  console.log('');

  const txSig = await connection.requestAirdrop(payer.publicKey, 5 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(txSig, 'confirmed');
  const txSig2 = await connection.requestAirdrop(backendSigner.publicKey, 5 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(txSig2, 'confirmed');

  const wallet = new Wallet(payer);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  setProvider(provider);
  const program = new Program(
    require('../target/idl/oddtrust_oracle.json'),
    provider,
  ) as Program<OddtrustOracle>;

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId,
  );
  console.log('📋 Config PDA:', EXPLORER_ACCOUNT.replace('{addr}', configPda.toBase58()));

  // Step 1: Initialize config
  console.log('\n🔧 Step 1: initializeConfig');
  const initSig = await program.methods
    .initializeConfig(authority.publicKey, backendSigner.publicKey)
    .accounts({
      payer: payer.publicKey,
      config: configPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([payer])
    .rpc();
  console.log(`   ✅ Config initialized: ${EXPLORER_TX.replace('{sig}', initSig)}`);

  // Step 2: Submit a CONSISTENT check → EXECUTED
  console.log('\n✅ Step 2: submitCheck (CONSISTENT, margin=+200bps)');
  const consistentFixtureId = hash('match-1');
  const consistentProofRef = hash('txline-proof-1');
  const [fixturePda1] = PublicKey.findProgramAddressSync(
    [Buffer.from('fixture'), consistentFixtureId],
    program.programId,
  );
  const submitSig1 = await program.methods
    .submitCheck(consistentFixtureId, true, 200, consistentProofRef)
    .accounts({
      config: configPda,
      backendSigner: backendSigner.publicKey,
      fixtureTrust: fixturePda1,
      systemProgram: SystemProgram.programId,
    })
    .signers([backendSigner])
    .rpc();
  console.log(`   ✅ Submitted: ${EXPLORER_TX.replace('{sig}', submitSig1)}`);

  // Step 3: trading_agent_check on consistent → EXECUTED
  console.log('\n🚀 Step 3: tradingAgentCheck (should be EXECUTED)');
  const tradeSig1 = await program.methods
    .tradingAgentCheck(consistentFixtureId)
    .accounts({
      agent: backendSigner.publicKey,
      fixtureTrust: fixturePda1,
    })
    .signers([backendSigner])
    .rpc();
  const tx1 = await connection.getTransaction(tradeSig1, { commitment: 'confirmed' });
  const executed = tx1?.meta?.logMessages?.some((l) => l.includes('EXECUTED'));
  console.log(`   ${executed ? '✅' : '❌'} Agent EXECUTED: ${EXPLORER_TX.replace('{sig}', tradeSig1)}`);

  // Step 4: Submit an INCONSISTENT check → BLOCKED
  console.log('\n❌ Step 4: submitCheck (INCONSISTENT, margin=-50bps)');
  const inconsistentFixtureId = hash('match-2');
  const inconsistentProofRef = hash('txline-proof-2');
  const [fixturePda2] = PublicKey.findProgramAddressSync(
    [Buffer.from('fixture'), inconsistentFixtureId],
    program.programId,
  );
  const submitSig2 = await program.methods
    .submitCheck(inconsistentFixtureId, false, -50, inconsistentProofRef)
    .accounts({
      config: configPda,
      backendSigner: backendSigner.publicKey,
      fixtureTrust: fixturePda2,
      systemProgram: SystemProgram.programId,
    })
    .signers([backendSigner])
    .rpc();
  console.log(`   ✅ Submitted: ${EXPLORER_TX.replace('{sig}', submitSig2)}`);
  const config = await program.account.oracleConfig.fetch(configPda);
  console.log(`   📊 Total checks: ${config.totalChecks}, Inconsistencies: ${config.totalInconsistencies}`);

  // Step 5: trading_agent_check on inconsistent → BLOCKED
  console.log('\n🚫 Step 5: tradingAgentCheck (should be BLOCKED)');
  const tradeSig2 = await program.methods
    .tradingAgentCheck(inconsistentFixtureId)
    .accounts({
      agent: backendSigner.publicKey,
      fixtureTrust: fixturePda2,
    })
    .signers([backendSigner])
    .rpc();
  const tx2 = await connection.getTransaction(tradeSig2, { commitment: 'confirmed' });
  const blocked = tx2?.meta?.logMessages?.some((l) => l.includes('BLOCKED'));
  console.log(`   ${blocked ? '✅' : '❌'} Agent BLOCKED: ${EXPLORER_TX.replace('{sig}', tradeSig2)}`);

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Demo complete — summary:');
  console.log(`   Program ID: ${program.programId.toBase58()}`);
  console.log(`   Config PDA: ${configPda.toBase58()}`);
  console.log(`   Fixture 1 (CONSISTENT): ${fixturePda1.toBase58()}`);
  console.log(`   Fixture 2 (INCONSISTENT): ${fixturePda2.toBase58()}`);
  console.log(`   Total checks: ${config.totalChecks}`);
  console.log(`   Total inconsistencies: ${config.totalInconsistencies}`);
  console.log(`\n   ${executed ? '✅' : '❌'} Agent check 1: ${executed ? 'EXECUTED' : 'FAILED'}`);
  console.log(`   ${blocked ? '✅' : '❌'} Agent check 2: ${blocked ? 'BLOCKED' : 'FAILED'}`);
  console.log('\n🎉 Done!');
}

main().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
