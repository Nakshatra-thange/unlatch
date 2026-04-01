use anchor_lang::prelude::*;

use crate::state::ConditionType;
use crate::errors::OracleError;

pub fn handler(ctx: Context<SetResolved>) -> Result<()> {
    let config = &mut ctx.accounts.condition_config;

    require!(
        config.condition_type == ConditionType::ManualBool,
        OracleError::ConditionNotMet
    );
    require!(!config.resolved, OracleError::AlreadyResolved);
    require!(
        ctx.accounts.resolve_authority.key() == config.resolve_authority,
        OracleError::UnauthorizedResolver
    );

    config.resolved = true;
    msg!("condition resolved — ready to release");
    Ok(())
}

#[derive(Accounts)]
pub struct SetResolved<'info> {
    pub resolve_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"condition", condition_config.escrow_state.as_ref()],
        bump  = condition_config.bump,
    )]
    pub condition_config: Account<'info, crate::state::ConditionConfig>,
}