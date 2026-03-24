use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("caller is not the stored release_authority")]
    UnauthorizedCaller,

    #[msg("escrow has already been released")]
    AlreadyReleased,

    #[msg("on-chain condition has not been met")]
    ConditionNotMet,

    #[msg("policy violation — spending limit or chain restriction")]
    PolicyViolation,

    #[msg("PDA seeds do not match expected derivation")]
    InvalidSeeds,

    #[msg("deposit amount must be greater than zero")]
    InvalidAmount,
}