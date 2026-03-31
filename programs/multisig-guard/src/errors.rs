use anchor_lang::prelude::*;

#[error_code]
pub enum GuardError {
    #[msg("signer is not in the approved_signers list")]
    NotAnApprover,

    #[msg("this signer has already approved")]
    AlreadyApproved,

    #[msg("not enough approvals collected yet")]
    InsufficientApprovals,

    #[msg("guard has already been executed")]
    AlreadyExecuted,

    #[msg("approved_signers list cannot be empty")]
    EmptySignersList,

    #[msg("required_approvals cannot exceed number of signers")]
    InvalidThreshold,

    #[msg("too many signers — max is 10")]
    TooManySigners,
}