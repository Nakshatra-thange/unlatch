use anchor_lang::prelude::*;

use crate::{InitConditionParams, InitializeCondition, ConditionType};
use crate::error::OracleError;

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
