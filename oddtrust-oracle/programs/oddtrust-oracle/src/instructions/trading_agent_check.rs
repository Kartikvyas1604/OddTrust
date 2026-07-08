use anchor_lang::prelude::*;

use crate::{
    constants::FIXTURE_TRUST_SEED,
    error::ErrorCode,
    events::{AgentCheckExecuted, AgentDecision},
    state::FixtureTrust,
};

/// Composable trading agent check — simulates an agent reading trust data
/// and deciding whether to EXECUTE or BLOCK a trade based on the fixture's
/// consistency status.
///
/// This instruction demonstrates how other Solana programs can query the
/// OddsTrust oracle via CPI. The agent reads the trust account and emits an
/// event reflecting its decision.
///
/// ## Decision logic
/// - If `fixture_trust.is_consistent == true` → `AgentDecision::Executed`
/// - If `fixture_trust.is_consistent == false` → `AgentDecision::Blocked`
///
/// ## Compute notes
/// This instruction is intentionally lightweight (~2k CU): one account read,
/// one condition check, one event emit. No CPIs, no reallocations.
#[derive(Accounts)]
#[instruction(fixture_id: [u8; 32])]
pub struct TradingAgentCheck<'info> {
    /// The agent executing the check. In production this would be a program
    /// calling via CPI; here we use a signer for direct invocation.
    #[account(mut)]
    pub agent: Signer<'info>,
    #[account(
        seeds = [FIXTURE_TRUST_SEED, fixture_id.as_ref()],
        bump = fixture_trust.bump,
    )]
    pub fixture_trust: Account<'info, FixtureTrust>,
}

pub fn handle(ctx: Context<TradingAgentCheck>, fixture_id: [u8; 32]) -> Result<()> {
    let ft = &ctx.accounts.fixture_trust;

    require!(
        ft.fixture_id == fixture_id,
        ErrorCode::FixtureNotFound
    );

    let decision = if ft.is_consistent {
        AgentDecision::Executed
    } else {
        AgentDecision::Blocked
    };

    emit!(AgentCheckExecuted {
        fixture_id,
        is_consistent: ft.is_consistent,
        margin_bps: ft.margin_bps,
        decision: decision.clone(),
    });

    msg!(
        "Agent check — fixture: {:?}, consistent: {}, margin: {}bps, decision: {:?}",
        fixture_id,
        ft.is_consistent,
        ft.margin_bps,
        decision,
    );

    Ok(())
}
