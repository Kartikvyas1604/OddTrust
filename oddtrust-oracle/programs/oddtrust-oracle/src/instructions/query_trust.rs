use anchor_lang::prelude::*;

use crate::{
    constants::FIXTURE_TRUST_SEED,
    error::ErrorCode,
    events::TrustQueried,
    state::FixtureTrust,
};

#[derive(Accounts)]
#[instruction(fixture_id: [u8; 32])]
pub struct QueryTrust<'info> {
    #[account(
        seeds = [FIXTURE_TRUST_SEED, fixture_id.as_ref()],
        bump = fixture_trust.bump,
    )]
    pub fixture_trust: Account<'info, FixtureTrust>,
}

pub fn handle(ctx: Context<QueryTrust>, fixture_id: [u8; 32]) -> Result<()> {
    let ft = &ctx.accounts.fixture_trust;

    require!(
        ft.fixture_id == fixture_id,
        ErrorCode::FixtureNotFound
    );

    let timestamp = Clock::get()?.unix_timestamp;

    emit!(TrustQueried {
        fixture_id,
        is_consistent: ft.is_consistent,
        margin_bps: ft.margin_bps,
        timestamp,
    });

    msg!(
        "Trust query — fixture: {:?}, consistent: {}, margin: {}bps, slot: {}",
        fixture_id,
        ft.is_consistent,
        ft.margin_bps,
        ft.last_checked_slot,
    );

    Ok(())
}
