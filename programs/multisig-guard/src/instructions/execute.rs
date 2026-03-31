use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::instruction::AccountMeta;
use anchor_lang::solana_program::program::invoke;

use crate::state::GuardState;
use crate::errors::GuardError;

pub fn execute(ctx: Context<Execute>) -> Result<()> {
    let guard = &mut ctx.accounts.guard_state;

    require!(!guard.is_executed, GuardError::AlreadyExecuted);
    require!(
        guard.approvals_collected >= guard.required_approvals,
        GuardError::InsufficientApprovals
    );

    guard.is_executed = true;

    // ---- CPI into condition-oracle's try_release ------------------
    // condition-oracle will internally CPI into escrow-core.
    // guard does not need to know about escrow-core at all.
    // this is the composability payoff.

    let discriminator: [u8; 8] = {
    
        let h = hash::hash(b"global:try_release");
        h.to_bytes()[..8].try_into().unwrap()
    };

    let ix = Instruction {
        program_id: ctx.accounts.oracle_program.key(),
        accounts: vec![
            // matches TryRelease struct in condition-oracle exactly, in order
            AccountMeta::new(ctx.accounts.cranker.key(), true),
            AccountMeta::new_readonly(ctx.accounts.condition_config.key(), false),
            AccountMeta::new_readonly(ctx.accounts.release_authority.key(), false),
            AccountMeta::new(ctx.accounts.escrow_state.key(), false),
            AccountMeta::new(ctx.accounts.vault.key(), false),
            AccountMeta::new(ctx.accounts.depositor_ata.key(), false),
            AccountMeta::new_readonly(ctx.accounts.escrow_core_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        ],
        data: discriminator.to_vec(),
    };

    invoke(
        &ix,
        &[
            ctx.accounts.cranker.to_account_info(),
            ctx.accounts.condition_config.to_account_info(),
            ctx.accounts.release_authority.to_account_info(),
            ctx.accounts.escrow_state.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.depositor_ata.to_account_info(),
            ctx.accounts.escrow_core_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
    )?;

    msg!("3-hop CPI chain complete: guard -> oracle -> escrow-core");

    Ok(())
}

#[derive(Accounts)]
pub struct Execute<'info> {
    /// cranker pays tx fee — anyone can call this once threshold is met
    #[account(mut)]
    pub cranker: Signer<'info>,

    #[account(
        mut,
        seeds = [b"guard", guard_state.condition_config.as_ref()],
        bump  = guard_state.bump,
    )]
    pub guard_state: Account<'info, GuardState>,

    /// CHECK: condition_config from condition-oracle
    pub condition_config: AccountInfo<'info>,

    /// CHECK: release_authority PDA from condition-oracle
    /// seeds = [b"release", condition_config.key()] in oracle program
    pub release_authority: AccountInfo<'info>,

    /// CHECK: escrow_state from escrow-core, passed through to oracle
    #[account(mut)]
    pub escrow_state: AccountInfo<'info>,

    /// CHECK: vault PDA from escrow-core, passed through to oracle
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// CHECK: depositor ATA, passed through to oracle
    #[account(mut)]
    pub depositor_ata: AccountInfo<'info>,

    /// CHECK: condition-oracle program
    pub oracle_program: AccountInfo<'info>,

    /// CHECK: escrow-core program, passed through to oracle
    pub escrow_core_program: AccountInfo<'info>,

    pub token_program: Program<'info, anchor_spl::token::Token>,
}