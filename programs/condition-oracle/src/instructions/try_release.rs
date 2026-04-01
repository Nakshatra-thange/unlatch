use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
};
use anchor_lang::solana_program::keccak;

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

    // anchor discriminator = first 8 bytes of keccak256("global:release")
    let hash = keccak::hash(b"global:release");
    let discriminator: [u8; 8] = hash.0[..8].try_into().unwrap();

    let ix = Instruction {
        program_id: ctx.accounts.escrow_core_program.key(),
        accounts: vec![
            AccountMeta::new_readonly(ctx.accounts.release_authority.key(), true),
            AccountMeta::new(ctx.accounts.escrow_state.key(), false),
            AccountMeta::new(ctx.accounts.vault.key(), false),
            AccountMeta::new(ctx.accounts.depositor_ata.key(), false),
            AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        ],
        data: discriminator.to_vec(),
    };

    invoke_signed(
        &ix,
        &[
            ctx.accounts.release_authority.to_account_info(),
            ctx.accounts.escrow_state.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.depositor_ata.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        signer_seeds,
    )?;

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