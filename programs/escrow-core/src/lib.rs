use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use state::EscrowState;

declare_id!("71e8gkv5oeQPmqfzH1686HDucs1Aq3xvJ7yjvQW9RZ9L");

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

#[program]
pub mod escrow_core {
    use super::*;

    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
        release_authority: Pubkey,
    ) -> Result<()> {
        instructions::deposit::handler(ctx, amount, release_authority)
    }

    pub fn release(ctx: Context<Release>) -> Result<()> {
        instructions::release::handler(ctx)
    }
}