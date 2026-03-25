use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ConditionType {
    /// fires when Clock::unix_timestamp >= target_timestamp
    TimestampAfter,
    /// fires when resolved is manually flipped to true
    ManualBool,
}

impl Default for ConditionType {
    fn default() -> Self {
        ConditionType::ManualBool
    }
}

#[account]
#[derive(Default)]
pub struct ConditionConfig {
    /// which escrow_state this condition is linked to
    pub escrow_state: Pubkey,

    /// the type of condition being checked
    pub condition_type: ConditionType,

    /// used by TimestampAfter — unix timestamp to unlock after
    pub target_timestamp: i64,

    /// used by ManualBool — flipped to true by resolve_authority
    pub resolved: bool,

    /// who is allowed to call set_resolved (only used for ManualBool)
    pub resolve_authority: Pubkey,

    /// bump for ConditionConfig PDA
    /// seeds = [b"condition", escrow_state.key()]
    pub bump: u8,

    /// bump for release_authority PDA
    /// seeds = [b"release", condition_config.key()]
    /// this address is what gets stored in EscrowState.release_authority
    pub release_bump: u8,
}

impl ConditionConfig {
    pub const LEN: usize = 8   // discriminator
        + 32                   // escrow_state
        + 1                    // condition_type enum
        + 8                    // target_timestamp
        + 1                    // resolved
        + 32                   // resolve_authority
        + 1                    // bump
        + 1;                   // release_bump
}