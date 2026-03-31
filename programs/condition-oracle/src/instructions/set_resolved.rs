use anchor_lang::prelude::*;

use crate::{SetResolved, ConditionType, ConditionConfig};
use crate::error::OracleError;

pub fn handler(ctx: Context<SetResolved>) -> Result<()> {
    let config = &mut ctx.accounts.condition_config;

    require!(
        config.condition_type == ConditionType::ManualBool,
        OracleError::ConditionNotMet // wrong type, not a manual condition
    );
    require!(
        !config.resolved,
        OracleError::AlreadyResolved
    );
    require!(
        ctx.accounts.resolve_authority.key() == config.resolve_authority,
        OracleError::UnauthorizedResolver
    );

    config.resolved = true;

    msg!("condition resolved — ready to release");

    Ok(())
}
