use anchor_lang::prelude::*;

use crate::state::{ConditionConfig, ConditionType};
use crate::errors::OracleError;

pub fn handler(ctx: Context<TryRelease>) -> Result<()> {
    let config = &ctx.accounts.condition_config;

    match config.condition_type {
        ConditionType::TimestampAfter => {
            let now = Clock::get()?.unix_timestamp;
            require!(now >= config.target_timestamp, OracleError::ConditionNotMet);
        }
        ConditionType::ManualBool => {
            require!(config.resolved, OracleError::ConditionNotMet);
        }
    }

    let condition_config_key = config.key();
    let release_bump = config.release_bump;

    let seeds: &[&[u8]] = &[
        b"release",
        condition_config_key.as_ref(),
        &[release_bump],
    ];
    let signer_seeds = &[seeds];

    let cpi_program = ctx.accounts.escrow_core_program.to_account_info();
    let cpi_accounts = escrow_core::cpi::accounts::Release {
        release_authority: ctx.accounts.release_authority.to_account_info(),
        escrow_state: ctx.accounts.escrow_state.to_account_info(),
        vault: ctx.accounts.vault.to_account_info(),
        depositor_ata: ctx.accounts.depositor_ata.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        cpi_program,
        cpi_accounts,
        signer_seeds,
    );

    escrow_core::cpi::release(cpi_ctx)?;

    msg!("escrow released via CPI");
    Ok(())
}

#[derive(Accounts)]
pub struct TryRelease<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,

    #[account(
        seeds = [b"condition", condition_config.escrow_state.as_ref()],
        bump  = condition_config.bump,
    )]
    pub condition_config: Account<'info, ConditionConfig>,

    /// CHECK: PDA signer — seeds [b"release", condition_config]
    #[account(
        seeds = [b"release", condition_config.key().as_ref()],
        bump  = condition_config.release_bump,
    )]
    pub release_authority: AccountInfo<'info>,

    /// CHECK: passed through to escrow-core
    #[account(mut)]
    pub escrow_state: AccountInfo<'info>,

    /// CHECK: passed through to escrow-core
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// CHECK: passed through to escrow-core
    #[account(mut)]
    pub depositor_ata: AccountInfo<'info>,

    /// CHECK: escrow-core program
    pub escrow_core_program: AccountInfo<'info>,

    pub token_program: Program<'info, anchor_spl::token::Token>,
}
