use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

pub use state::*;
use instructions::approve::Approve;
use instructions::approve::__client_accounts_approve;
use instructions::execute::Execute;
use instructions::execute::__client_accounts_execute;
use instructions::initialize_guard::InitializeGuard;
use instructions::initialize_guard::__client_accounts_initialize_guard;

declare_id!("BweWEmsS5txchdCRTgPLi31UNeS19rf4DpQnTDsubVLY");

#[program]
pub mod multisig_guard {
    use super::*;

    pub fn initialize_guard(
        ctx: Context<InitializeGuard>,
        approved_signers: Vec<Pubkey>,
        required_approvals: u8,
    ) -> Result<()> {
        instructions::initialize_guard::handler(ctx, approved_signers, required_approvals)
    }

    pub fn approve(ctx: Context<Approve>) -> Result<()> {
        instructions::approve::handler(ctx)
    }

    pub fn execute(ctx: Context<Execute>) -> Result<()> {
        instructions::execute::handler(ctx)
    }
}
