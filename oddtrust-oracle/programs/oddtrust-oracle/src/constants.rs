use anchor_lang::prelude::*;

#[constant]
pub const ORACLE_CONFIG_SEED: &[u8] = b"config";

#[constant]
pub const FIXTURE_TRUST_SEED: &[u8] = b"fixture";

#[constant]
pub const MAX_MARGIN_BPS: i32 = 100_00;

#[constant]
pub const MAX_CHECK_COUNT: u32 = 1_000_000;
