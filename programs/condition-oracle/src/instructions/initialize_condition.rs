use anchor_lang::prelude::*;

use crate::state::{ConditionConfig, ConditionType};
use crate::errors::OracleError;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitConditionParams {
    pub condition_type: ConditionType,
    pub target_timestamp: i64,
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

    /// CHECK: derived PDA, no data, used only as a signer in try_release
    #[account(
        seeds = [b"release", condition_config.key().as_ref()],
        bump,
    )]
    pub release_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeCondition>,
    params: InitConditionParams,
) -> Result<()> {
    // validate timestamp if that condition type is chosen
    if params.condition_type == ConditionType::TimestampAfter {
        let now = Clock::get()?.unix_timestamp;
        require!(
            params.target_timestamp > now,
            OracleError::InvalidTimestamp
        );
    }

    let config = &mut ctx.accounts.condition_config;
    config.escrow_state      = ctx.accounts.escrow_state.key();
    config.condition_type    = params.condition_type;
    config.target_timestamp  = params.target_timestamp;
    config.resolved          = false;
    config.resolve_authority = params.resolve_authority;
    config.bump              = ctx.bumps.condition_config;
    config.release_bump      = ctx.bumps.release_authority;

    // log the release_authority address so the caller can
    // copy it into escrow-core's deposit instruction
    msg!(
        "release_authority PDA: {}",
        ctx.accounts.release_authority.key()
    );

    Ok(())
}
