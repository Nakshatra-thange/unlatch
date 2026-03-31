use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};

use crate::Deposit;
use crate::errors::EscrowError;


pub fn handler(
    ctx: Context<Deposit>,
    amount: u64,
    release_authority: Pubkey,
) -> Result<()> {
    require!(amount > 0, EscrowError::InvalidAmount);

    // write escrow state
    let state = &mut ctx.accounts.escrow_state;
    state.depositor       = ctx.accounts.depositor.key();
    state.mint            = ctx.accounts.mint.key();
    state.amount          = amount;
    state.release_authority = release_authority;
    state.bump            = ctx.bumps.escrow_state;
    state.vault_bump      = ctx.bumps.vault;
    state.is_released     = false;

    // transfer tokens from depositor ATA → vault PDA
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from:      ctx.accounts.depositor_ata.to_account_info(),
            to:        ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.depositor.to_account_info(),
        },
    );
    token::transfer(cpi_ctx, amount)?;

    Ok(())
}