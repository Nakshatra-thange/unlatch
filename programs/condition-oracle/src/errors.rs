use anchor_lang::prelude::*;

#[error_code]
pub enum OracleError {
    #[msg("Target timestamp must be in the future")]
    InvalidTimestamp,

    #[msg("Condition has not been met")]
    ConditionNotMet,

    #[msg("Condition already resolved")]
    AlreadyResolved,

    #[msg("Caller is not authorized to resolve")]
    UnauthorizedResolver,
}