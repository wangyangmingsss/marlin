use anchor_lang::prelude::*;

use crate::errors::MarlinError;
use crate::state::Merchant;
use crate::is_supported_mint;

#[derive(Accounts)]
#[instruction(merchant_id: [u8; 16])]
pub struct InitializeMerchant<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Merchant::LEN,
        seeds = [b"merchant", authority.key().as_ref()],
        bump,
    )]
    pub merchant: Account<'info, Merchant>,

    /// CHECK: Validated via is_supported_mint in handler.
    pub settlement_mint: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeMerchant>,
    merchant_id: [u8; 16],
    display_name: [u8; 64],
    default_settlement_mint: Pubkey,
) -> Result<()> {
    require!(
        is_supported_mint(&ctx.accounts.settlement_mint.key()),
        MarlinError::MintNotSupported
    );

    // Validate display_name is non-empty (at least one non-zero byte)
    require!(
        display_name.iter().any(|&b| b != 0),
        MarlinError::InvalidDisplayName
    );

    let merchant = &mut ctx.accounts.merchant;
    merchant.authority = ctx.accounts.authority.key();
    merchant.merchant_id = merchant_id;
    merchant.display_name = display_name;
    merchant.default_settlement_mint = default_settlement_mint;
    merchant.created_at = Clock::get()?.unix_timestamp;
    merchant.total_volume = 0;
    merchant.bump = ctx.bumps.merchant;
    merchant._reserved = [0u8; 96];

    Ok(())
}
