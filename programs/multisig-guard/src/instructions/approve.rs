use anchor_lang::prelude::*;

use crate::state::GuardState;
use crate::errors::GuardError;

pub fn handler(ctx: Context<Approve>) -> Result<()> {
    let guard   = &mut ctx.accounts.guard_state;
    let signer  = ctx.accounts.approver.key();

    require!(!guard.is_executed, GuardError::AlreadyExecuted);

    // check signer is a valid approver
    require!(
        guard.approved_signers.contains(&signer.key()),
        GuardError::NotAnApprover
    );

    // check signer has not already voted
    require!(
        !guard.approved_by.contains(&signer.key()),
        GuardError::AlreadyApproved
    );

    guard.approved_by.push(signer);
    guard.approvals_collected += 1;

    msg!(
        "approval recorded: {}/{} collected",
        guard.approvals_collected,
        guard.required_approvals
    );

    Ok(())
}

#[derive(Accounts)]
pub struct Approve<'info> {
    pub approver: Signer<'info>,

    #[account(
        mut,
        seeds = [b"guard", guard_state.condition_config.as_ref()],
        bump  = guard_state.bump,
    )]
    pub guard_state: Account<'info, GuardState>,
}