pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
pub use instructions::*;

pub use constants::*;

declare_id!("CzbLXoXA4SLRDtdpPPyiGDHDFACzLTAty1ioYvE1nHDc");



#[program]
pub mod multisig_guard {
    use super::*;

    pub fn initialize_guard(
        ctx: Context<initialize_guard::InitializeGuard>,
        approved_signers: Vec<Pubkey>,
        required_approvals: u8,
    ) -> Result<()> {
        initialize_guard::handler(ctx, approved_signers, required_approvals)
    }

    pub fn approve(
        ctx: Context<approve::Approve>,
    ) -> Result<()> {
        approve::handler(ctx)
    }

    pub fn execute(
        ctx: Context<execute::Execute>,
    ) -> Result<()> {
        execute::handler(ctx)
    }
}