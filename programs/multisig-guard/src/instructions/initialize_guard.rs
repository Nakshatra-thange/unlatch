use anchor_lang::prelude::*;

use crate::state::GuardState;
use crate::errors::GuardError;

pub fn handler(
    ctx: Context<InitializeGuard>,
    approved_signers: Vec<Pubkey>,
    required_approvals: u8,
) -> Result<()> {
    require!(
        !approved_signers.is_empty(),
        GuardError::EmptySignersList
    );
    require!(
        approved_signers.len() <= GuardState::MAX_SIGNERS,
        GuardError::TooManySigners
    );
    require!(
        required_approvals > 0
            && required_approvals <= approved_signers.len() as u8,
        GuardError::InvalidThreshold
    );

    let guard = &mut ctx.accounts.guard_state;
    guard.condition_config    = ctx.accounts.condition_config.key();
    guard.oracle_program      = ctx.accounts.oracle_program.key();
    guard.required_approvals  = required_approvals;
    guard.approvals_collected = 0;
    guard.approved_signers    = approved_signers;
    guard.approved_by         = Vec::new();
    guard.is_executed         = false;
    guard.bump                = ctx.bumps.guard_state;

    Ok(())
}

#[derive(Accounts)]
#[instruction(approved_signers: Vec<Pubkey>, required_approvals: u8)]
pub struct InitializeGuard<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: condition_config from condition-oracle, verified by key only
    pub condition_config: AccountInfo<'info>,

    /// CHECK: the oracle program that owns condition_config
    pub oracle_program: AccountInfo<'info>,

    #[account(
        init,
        payer = payer,
        space = GuardState::LEN,
        seeds = [b"guard", condition_config.key().as_ref()],
        bump,
    )]
    pub guard_state: Account<'info, GuardState>,

    pub system_program: Program<'info, System>,
}