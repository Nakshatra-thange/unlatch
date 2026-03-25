pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("AXUUG9hFsbPGsFnyKw7DSdqhsPXhTPZd68mkp51qMLMb");





#[program]
pub mod condition_oracle {
    use super::*;

    pub fn initialize_condition(
        ctx: Context<initialize_condition::InitializeCondition>,
        params: InitConditionParams,
    ) -> Result<()> {
        initialize_condition::handler(ctx, params)
    }

    pub fn set_resolved(
        ctx: Context<set_resolved::SetResolved>,
    ) -> Result<()> {
        set_resolved::handler(ctx)
    }

    pub fn try_release(
        ctx: Context<try_release::TryRelease>,
    ) -> Result<()> {
        try_release::handler(ctx)
    }
}
