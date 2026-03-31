use anchor_lang::prelude::*;

#[account]
pub struct GuardState {
    /// the condition_config this guard wraps
    pub condition_config: Pubkey,

    /// the oracle program that owns condition_config
    pub oracle_program: Pubkey,

    /// how many approvals are needed before execute fires
    pub required_approvals: u8,

    /// how many have been collected so far
    pub approvals_collected: u8,

    /// list of pubkeys that are valid approvers
    /// max 10 approvers
    pub approved_signers: Vec<Pubkey>,

    /// list of pubkeys that have already approved
    /// used to prevent duplicate votes
    pub approved_by: Vec<Pubkey>,

    /// whether execute has already been called
    pub is_executed: bool,

    /// bump for GuardState PDA
    /// seeds = [b"guard", condition_config.key()]
    pub bump: u8,
}

impl GuardState {
    /// 10 approvers max
    pub const MAX_SIGNERS: usize = 10;

    pub const LEN: usize = 8         // discriminator
        + 32                         // condition_config
        + 32                         // oracle_program
        + 1                          // required_approvals
        + 1                          // approvals_collected
        + 4 + (32 * Self::MAX_SIGNERS) // approved_signers vec
        + 4 + (32 * Self::MAX_SIGNERS) // approved_by vec
        + 1                          // is_executed
        + 1;                         // bump
}