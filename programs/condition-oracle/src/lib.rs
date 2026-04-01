use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

pub use state::*;
use instructions::initialize_condition::{InitConditionParams, InitializeCondition};
use instructions::initialize_condition::__client_accounts_initialize_condition;
use instructions::set_resolved::SetResolved;
use instructions::set_resolved::__client_accounts_set_resolved;
use instructions::try_release::TryRelease;
use instructions::try_release::__client_accounts_try_release;

declare_id!("3crHL5VNeSDvFgpCYEEMUYCfUhrQHu2KBauAaU9qfbMG");

#[program]
pub mod condition_oracle {
    use super::*;

    pub fn initialize_condition(
        ctx: Context<InitializeCondition>,
        params: InitConditionParams,
    ) -> Result<()> {
        instructions::initialize_condition::handler(ctx, params)
    }

    pub fn set_resolved(ctx: Context<SetResolved>) -> Result<()> {
        instructions::set_resolved::handler(ctx)
    }

    pub fn try_release(ctx: Context<TryRelease>) -> Result<()> {
        instructions::try_release::handler(ctx)
    }
}
