use anchor_lang::prelude::*;

use crate::errors::MarlinError;
use crate::state::Merchant;
use crate::is_supported_mint;

#[derive(Accounts)]
pub struct UpdateMerchant<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"merchant", authority.key().as_ref()],
        bump = merchant.bump,
        has_one = authority @ MarlinError::Unauthorized,
    )]
    pub merchant: Account<'info, Merchant>,
}

pub fn handler(
    ctx: Context<UpdateMerchant>,
    display_name: Option<[u8; 64]>,
    default_settlement_mint: Option<Pubkey>,
) -> Result<()> {
    let merchant = &mut ctx.accounts.merchant;

    if let Some(name) = display_name {
        require!(
            name.iter().any(|&b| b != 0),
            MarlinError::InvalidDisplayName
        );
        merchant.display_name = name;
    }

    if let Some(mint) = default_settlement_mint {
        require!(is_supported_mint(&mint), MarlinError::MintNotSupported);
        merchant.default_settlement_mint = mint;
    }

    Ok(())
}
