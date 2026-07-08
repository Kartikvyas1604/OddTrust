pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("HooVY5etEhNnPWouvZhzGCgbTjBfk3mff66S8jFgaAit");

#[program]
pub mod oddtrust_oracle {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        authority: Pubkey,
        backend_signer: Pubkey,
    ) -> Result<()> {
        instructions::init_config::handle(ctx, authority, backend_signer)
    }

    pub fn submit_check(
        ctx: Context<SubmitCheck>,
        fixture_id: [u8; 32],
        is_consistent: bool,
        margin_bps: i32,
        txline_proof_ref: [u8; 32],
    ) -> Result<()> {
        instructions::submit_check::handle(ctx, fixture_id, is_consistent, margin_bps, txline_proof_ref)
    }

    pub fn query_trust(ctx: Context<QueryTrust>, fixture_id: [u8; 32]) -> Result<()> {
        instructions::query_trust::handle(ctx, fixture_id)
    }

    pub fn trading_agent_check(ctx: Context<TradingAgentCheck>, fixture_id: [u8; 32]) -> Result<()> {
        instructions::trading_agent_check::handle(ctx, fixture_id)
    }
}
