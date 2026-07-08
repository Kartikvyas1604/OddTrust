use anchor_lang::prelude::*;

/// Fixed-size 36-byte fixture ID encoding:
/// First 32 bytes = SHA-256 hash of the human-readable fixture ID string.
/// Remaining 4 bytes = big-endian U32 prefix discriminator (0x0000_0001).
/// This gives us predictable 36-byte seeds (Anchor max is 32 for a single seed,
/// so we use the 32-byte hash portion as the seed).
/// The prefix prevents collisions with other seed domains using the same hash space.
pub const FIXTURE_ID_BYTES: usize = 32;

#[account]
#[derive(InitSpace)]
pub struct FixtureTrust {
    pub fixture_id: [u8; 32],
    pub is_consistent: bool,
    pub margin_bps: i32,
    pub last_checked_slot: u64,
    pub last_checked_timestamp: i64,
    pub txline_proof_ref: [u8; 32],
    pub check_count: u32,
    pub bump: u8,
}
