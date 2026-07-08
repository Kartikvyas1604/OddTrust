use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Config already initialized")]
    ConfigAlreadyInitialized,
    #[msg("Config not initialized")]
    ConfigNotInitialized,
    #[msg("Only the backend signer can submit checks")]
    UnauthorizedSubmitter,
    #[msg("Fixture trust data not found")]
    FixtureNotFound,
    #[msg("Margin exceeds maximum allowed")]
    MarginOutOfRange,
    #[msg("Check count exceeds maximum allowed")]
    CheckCountOverflow,
    #[msg("Fixture id must be exactly 32 bytes")]
    InvalidFixtureId,
    #[msg("Proof ref must be exactly 32 bytes")]
    InvalidProofRef,
}
