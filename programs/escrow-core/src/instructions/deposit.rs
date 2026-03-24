use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::state::EscrowState;
use crate::errors::EscrowError;

//Instruction takes: amount, release_authority address. 
//Creates EscrowState, 
//creates VaultTokenAccount, transfers tokens from depositor into vault. Depositor signs. After this instruction, no human can move those tokens.

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

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer  = depositor,
        space  = EscrowState::LEN,
        seeds  = [b"escrow", depositor.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    /// vault is a token account owned by the escrow_state PDA
    #[account(
        init,
        payer             = depositor,
        token::mint       = mint,
        token::authority  = escrow_state,
        seeds             = [b"vault", escrow_state.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// depositor's token account for this mint
    #[account(
        mut,
        constraint = depositor_ata.owner == depositor.key(),
        constraint = depositor_ata.mint  == mint.key(),
    )]
    pub depositor_ata: Account<'info, TokenAccount>,

    pub token_program:  Program<'info, Token>,
    pub system_program: Program<'info, System>,
}