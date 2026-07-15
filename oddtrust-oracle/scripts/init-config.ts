import * as anchor from "@coral-xyz/anchor";

const WALLET_PUBKEY = new anchor.web3.PublicKey("C1tU85e6iBnzmx1fnZFmxaZb9tKVRmMKFR7yKRYiqF8B");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OddtrustOracle;

  console.log("Program ID:", program.programId.toBase58());
  console.log("Payer:", provider.wallet.publicKey.toBase58());

  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("oracle_config")],
    program.programId
  );

  console.log("Config PDA:", configPda.toBase58());

  const configAccount = await provider.connection.getAccountInfo(configPda);
  if (configAccount) {
    console.log("Config PDA already initialized! Skipping.");
    return;
  }

  console.log("Initializing oracle config...");
  const tx = await program.methods
    .initializeConfig(WALLET_PUBKEY, WALLET_PUBKEY)
    .accounts({
      payer: provider.wallet.publicKey,
      config: configPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("Transaction signature:", tx);
  console.log("Config initialized successfully!");

  const config = await program.account.oracleConfig.fetch(configPda);
  console.log("Verified config:", {
    authority: config.authority.toBase58(),
    backendSigner: config.backendSigner.toBase58(),
    totalChecks: config.totalChecks.toString(),
    totalInconsistencies: config.totalInconsistencies.toString(),
  });
}

main().catch(console.error);
