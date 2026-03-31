use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::Instruction, program::invoke_signed};

use crate::{TryRelease, ConditionType};
use crate::error::OracleError;

pub fn handler(ctx: Context<TryRelease>) -> Result<()> {
    let config = &ctx.accounts.condition_config;

    // ---- evaluate condition ----------------------------------------
    match config.condition_type {
        ConditionType::TimestampAfter => {
            let now = Clock::get()?.unix_timestamp;
            require!(
                now >= config.target_timestamp,
                OracleError::ConditionNotMet
            );
        }
        ConditionType::ManualBool => {
            require!(
                config.resolved,
                OracleError::ConditionNotMet
            );
        }
    }

    // ---- condition passed — CPI into escrow-core ------------------
    // the release_authority PDA signs via invoke_signed.
    // escrow-core checks: release_authority.is_signer == true
    //                 AND release_authority.key() == state.release_authority
    // both are satisfied here.

    let condition_config_key = config.key();
    let release_bump = config.release_bump;

    let release_seeds: &[&[u8]] = &[
        b"release",
        condition_config_key.as_ref(),
        &[release_bump],
    ];
    let signer_seeds = &[release_seeds];

    // build the escrow-core release instruction manually.
    // discriminator = first 8 bytes of sha256("global:release")
    // precomputed: first 8 bytes of sha256(\"global:release\")
    let discriminator: [u8; 8] = [253, 249, 15, 206, 28, 127, 193, 241];

    let ix = Instruction {
        program_id: ctx.accounts.escrow_core_program.key(),
        accounts: vec![
            // matches Release struct in escrow-core exactly, in order
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                ctx.accounts.release_authority.key(), true,  // is_signer = true
            ),
            anchor_lang::solana_program::instruction::AccountMeta::new(
                ctx.accounts.escrow_state.key(), false,
            ),
            anchor_lang::solana_program::instruction::AccountMeta::new(
                ctx.accounts.vault.key(), false,
            ),
            anchor_lang::solana_program::instruction::AccountMeta::new(
                ctx.accounts.depositor_ata.key(), false,
            ),
            anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                ctx.accounts.token_program.key(), false,
            ),
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
