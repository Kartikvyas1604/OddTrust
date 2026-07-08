use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct OracleConfig {
    pub authority: Pubkey,
    pub backend_signer: Pubkey,
    pub total_checks: u64,
    pub total_inconsistencies: u64,
    pub bump: u8,
}
