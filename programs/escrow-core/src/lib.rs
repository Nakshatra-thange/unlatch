pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("Aeme3QvXEKEip5jNkfZTrjpTxXognZXvw2jPb7HuGMte");

#[program]
pub mod escrow_core {
    use super::*;

    pub fn deposit(
        ctx: Context<deposit::Deposit>,
        amount: u64,
        release_authority: Pubkey,
    ) -> Result<()> {
        deposit::handler(ctx, amount, release_authority)
    }

    pub fn release(ctx: Context<release::Release>) -> Result<()> {
        release::handler(ctx)
    }
}