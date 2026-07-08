use anchor_lang::prelude::*;

use crate::{
    constants::ORACLE_CONFIG_SEED,
    error::ErrorCode,
    events::ConfigInitialized,
    state::OracleConfig,
};

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + OracleConfig::INIT_SPACE,
        seeds = [ORACLE_CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, OracleConfig>,
    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<InitializeConfig>, authority: Pubkey, backend_signer: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = authority;
    config.backend_signer = backend_signer;
    config.total_checks = 0;
    config.total_inconsistencies = 0;
    config.bump = ctx.bumps.config;

    emit!(ConfigInitialized {
        authority,
        backend_signer,
        timestamp: Clock::get()?.unix_timestamp,
    });

    msg!("Oracle config initialized — authority: {:?}, backend_signer: {:?}", authority, backend_signer);
    Ok(())
}
