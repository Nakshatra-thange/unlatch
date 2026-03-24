use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct EscrowState {
    pub depositor: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub release_authority: Pubkey,
    pub bump: u8,
    pub vault_bump: u8,
    pub is_released: bool,
}

impl EscrowState {
    /// 8 is discriminator 
    /// 32 for dep + mint , 8 for amt , 1 for other else
    pub const LEN: usize = 8 + 32 + 32 + 8 + 32 + 1 + 1 + 1;
}