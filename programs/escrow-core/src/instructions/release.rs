use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::EscrowState;
use crate::errors::EscrowError;

pub fn handler(ctx: Context<Release>) -> Result<()> {
    let state = &ctx.accounts.escrow_state;

    // guard: already released
    require!(!state.is_released, EscrowError::AlreadyReleased);

    // guard: the CPI caller must be the stored release_authority
    // anchor does not give us a `program_id` of the CPI caller directly,
    // so we verify by checking that the release_authority account was
    // passed as a signer. the condition-oracle signs with invoke_signed
    // using its PDA seeds — that signature is what we verify here.
    require!(
        ctx.accounts.release_authority.is_signer,
        EscrowError::UnauthorizedCaller
    );
    require!(
        ctx.accounts.release_authority.key() == state.release_authority,
        EscrowError::UnauthorizedCaller
    );

    let amount = state.amount;

    // seeds to let escrow_state PDA sign the vault transfer
    let depositor_key = state.depositor;
    let mint_key      = state.mint;
    let bump          = state.bump;

    let escrow_seeds: &[&[u8]] = &[
        b"escrow",
        depositor_key.as_ref(),
        mint_key.as_ref(),
        &[bump],
    ];
    let signer_seeds = &[escrow_seeds];

    // transfer vault → depositor ATA, signed by escrow_state PDA
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from:      ctx.accounts.vault.to_account_info(),
            to:        ctx.accounts.depositor_ata.to_account_info(),
            authority: ctx.accounts.escrow_state.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    // mark released
    ctx.accounts.escrow_state.is_released = true;

    Ok(())
}

#[derive(Accounts)]
pub struct Release<'info> {
    /// this is the oracle's PDA — it must be a signer
    /// no human wallet should ever be able to satisfy this
    /// CHECK: verified manually against escrow_state.release_authority
    pub release_authority: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [
            b"escrow",
            escrow_state.depositor.as_ref(),
            escrow_state.mint.as_ref(),
        ],
        bump  = escrow_state.bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    #[account(
        mut,
        seeds = [b"vault", escrow_state.key().as_ref()],
        bump  = escrow_state.vault_bump,
        token::mint      = escrow_state.mint,
        token::authority = escrow_state,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// depositor's ATA receives the funds back
    #[account(
        mut,
        constraint = depositor_ata.owner == escrow_state.depositor,
        constraint = depositor_ata.mint  == escrow_state.mint,
    )]
    pub depositor_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}