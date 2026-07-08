use anchor_lang::prelude::*;

#[event]
pub struct ConfigInitialized {
    pub authority: Pubkey,
    pub backend_signer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CheckSubmitted {
    pub fixture_id: [u8; 32],
    pub is_consistent: bool,
    pub margin_bps: i32,
    pub slot: u64,
    pub timestamp: i64,
    pub txline_proof_ref: [u8; 32],
    pub check_count: u32,
    pub backend_signer: Pubkey,
}

#[event]
pub struct TrustQueried {
    pub fixture_id: [u8; 32],
    pub is_consistent: bool,
    pub margin_bps: i32,
    pub timestamp: i64,
}

#[event]
pub struct AgentCheckExecuted {
    pub fixture_id: [u8; 32],
    pub is_consistent: bool,
    pub margin_bps: i32,
    pub decision: AgentDecision,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum AgentDecision {
    Executed,
    Blocked,
}
