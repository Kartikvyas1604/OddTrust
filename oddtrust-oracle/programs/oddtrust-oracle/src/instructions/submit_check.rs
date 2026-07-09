use anchor_lang::prelude::*;

use crate::{
    constants::{FIXTURE_TRUST_SEED, MAX_CHECK_COUNT, MAX_MARGIN_BPS, ORACLE_CONFIG_SEED},
    error::ErrorCode,
    events::CheckSubmitted,
    state::{FixtureTrust, OracleConfig},
};

/// Submit a consistency check result for a fixture.
///
/// ## Security
/// - `init_if_needed` is safe here because the PDA is deterministically derived from
///   `fixture_id` (32-byte hash). First write creates the account, subsequent writes
///   update it in-place. There is no risk of front-running or account squatting since
///   the PDA derivation ensures only this program can own the account.
/// - The `backend_signer` check (explicit Pubkey comparison against `config.backend_signer`)
///   ensures only the authorized backend signer can write results.
/// - `margin_bps` is bounded by `MAX_MARGIN_BPS` to prevent overflow on i32.
/// - `check_count` is bounded by `MAX_CHECK_COUNT` to prevent u32 overflow.
#[derive(Accounts)]
#[instruction(fixture_id: [u8; 32])]
pub struct SubmitCheck<'info> {
    #[account(
        mut,
        seeds = [ORACLE_CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, OracleConfig>,
    #[account(mut)]
    pub backend_signer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = backend_signer,
        space = 8 + FixtureTrust::INIT_SPACE,
        seeds = [FIXTURE_TRUST_SEED, fixture_id.as_ref()],
        bump
    )]
    pub fixture_trust: Account<'info, FixtureTrust>,
    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<SubmitCheck>,
    fixture_id: [u8; 32],
    is_consistent: bool,
    margin_bps: i32,
    txline_proof_ref: [u8; 32],
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let ft = &mut ctx.accounts.fixture_trust;

    require!(
        ctx.accounts.backend_signer.key() == config.backend_signer,
        ErrorCode::UnauthorizedSubmitter
    );

    require!(
        margin_bps.abs() <= MAX_MARGIN_BPS,
        ErrorCode::MarginOutOfRange
    );

    ft.bump = ctx.bumps.fixture_trust;

    let slot = Clock::get()?.slot;
    let timestamp = Clock::get()?.unix_timestamp;

    let new_check_count = ft.check_count.checked_add(1).ok_or(ErrorCode::CheckCountOverflow)?;
    require!(new_check_count <= MAX_CHECK_COUNT, ErrorCode::CheckCountOverflow);

    ft.fixture_id = fixture_id;
    ft.is_consistent = is_consistent;
    ft.margin_bps = margin_bps;
    ft.last_checked_slot = slot;
    ft.last_checked_timestamp = timestamp;
    ft.txline_proof_ref = txline_proof_ref;
    ft.check_count = new_check_count;

    config.total_checks = config.total_checks.checked_add(1).unwrap();
    if !is_consistent {
        config.total_inconsistencies = config.total_inconsistencies.checked_add(1).unwrap();
    }

    emit!(CheckSubmitted {
        fixture_id,
        is_consistent,
        margin_bps,
        slot,
        timestamp,
        txline_proof_ref,
        check_count: new_check_count,
        backend_signer: ctx.accounts.backend_signer.key(),
    });

    msg!(
        "Check submitted — fixture: {:?}, consistent: {}, margin: {}bps, slot: {}, check_count: {}",
        fixture_id,
        is_consistent,
        margin_bps,
        slot,
        new_check_count,
    );

    Ok(())
}
