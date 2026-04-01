use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::initialize_condition::{self, InitConditionParams};
use instructions::set_resolved;
use instructions::try_release;


declare_id!("3crHL5VNeSDvFgpCYEEMUYCfUhrQHu2KBauAaU9qfbMG");

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitConditionParams {
    pub condition_type:    ConditionType,
    /// used when condition_type == TimestampAfter
    pub target_timestamp:  i64,
    /// who can call set_resolved (ignored for TimestampAfter)
    pub resolve_authority: Pubkey,
}

#[derive(Accounts)]
pub struct InitializeCondition<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: this is the escrow_state from escrow-core.
    /// we only store its pubkey — no deserialization needed here.
    pub escrow_state: AccountInfo<'info>,

    #[account(
        init,
        payer = payer,
        space = ConditionConfig::LEN,
        seeds = [b"condition", escrow_state.key().as_ref()],
        bump,
    )]
    pub condition_config: Account<'info, ConditionConfig>,

    /// this is the PDA that escrow-core stores as release_authority.
    /// it has no data — it is a pure signer PDA.
    /// seeds = [b"release", condition_config.key()]
    /// CHECK: derived PDA, no data, used only as a signer in try_release
    #[account(
        seeds = [b"release", condition_config.key().as_ref()],
        bump,
    )]
    pub release_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetResolved<'info> {
    pub resolve_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"condition", condition_config.escrow_state.as_ref()],
        bump  = condition_config.bump,
    )]
    pub condition_config: Account<'info, ConditionConfig>,
}


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
