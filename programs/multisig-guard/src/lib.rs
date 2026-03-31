pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;

declare_id!("8WGXbgEDLDsM3viGNeiAtriJdVUq8y5Lp3NqVorJZH79");

#[derive(Accounts)]
pub struct Initialize {}

#[program]
pub mod multisig_guard {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }
}
