use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::MarlinError;
use crate::state::{ConfidentialInvoice, ConfidentialInvoiceStatus, Merchant};
use crate::{PROTOCOL_FEE_BPS, BPS_DENOMINATOR, PROTOCOL_FEE_RECEIVER};

#[event]
pub struct ConfidentialInvoicePaid {
    pub confidential_invoice: Pubkey,
    pub merchant: Pubkey,
    pub payer: Pubkey,
    pub revealed_amount: u64,
    pub revealed_mint: Pubkey,
    pub merchant_amount: u64,
    pub protocol_fee: u64,
    pub paid_at: i64,
}

#[derive(Accounts)]
pub struct PayConfidentialInvoice<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        constraint = confidential_invoice.status == ConfidentialInvoiceStatus::Open as u8
            @ MarlinError::InvoiceNotOpen,
    )]
    pub confidential_invoice: Account<'info, ConfidentialInvoice>,

    #[account(
        mut,
        seeds = [b"merchant", merchant.authority.as_ref()],
        bump = merchant.bump,
        constraint = merchant.key() == confidential_invoice.merchant
            @ MarlinError::MerchantMismatch,
    )]
    pub merchant: Account<'info, Merchant>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = payer_token_account.owner == payer.key() @ MarlinError::WrongOwner,
        constraint = payer_token_account.mint == mint.key() @ MarlinError::MintMismatch,
    )]
    pub payer_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = merchant_authority,
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,

    /// CHECK: The merchant's authority wallet, used to derive the merchant ATA.
    #[account(
        constraint = merchant_authority.key() == merchant.authority @ MarlinError::Unauthorized,
    )]
    pub merchant_authority: AccountInfo<'info>,

    /// CHECK: Protocol fee receiver address, validated against constant.
    #[account(
        constraint = protocol_fee_receiver.key() == PROTOCOL_FEE_RECEIVER @ MarlinError::Unauthorized,
    )]
    pub protocol_fee_receiver: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = protocol_fee_receiver,
    )]
    pub protocol_fee_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<PayConfidentialInvoice>,
    revealed_amount: u64,
    revealed_mint: Pubkey,
    nonce: [u8; 32],
) -> Result<()> {
    // Verify the revealed values produce the on-chain commitment hash.
    let computed_hash = compute_commitment(revealed_amount, &revealed_mint, &nonce);

    require!(
        computed_hash == ctx.accounts.confidential_invoice.commitment_hash,
        MarlinError::CommitmentMismatch
    );

    require!(
        ctx.accounts.mint.key() == revealed_mint,
        MarlinError::MintMismatch
    );

    // Compute amounts
    let protocol_fee = revealed_amount
        .checked_mul(PROTOCOL_FEE_BPS)
        .and_then(|x| x.checked_div(BPS_DENOMINATOR))
        .ok_or(MarlinError::MathOverflow)?;
    let merchant_amount = revealed_amount
        .checked_sub(protocol_fee)
        .ok_or(MarlinError::MathOverflow)?;

    // Transfer merchant_amount to merchant ATA
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.payer_token_account.to_account_info(),
                to: ctx.accounts.merchant_token_account.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            },
        ),
        merchant_amount,
    )?;

    // Transfer fee to protocol fee ATA
    if protocol_fee > 0 {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer_token_account.to_account_info(),
                    to: ctx.accounts.protocol_fee_token_account.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            protocol_fee,
        )?;
    }

    // Update state
    let now = Clock::get()?.unix_timestamp;
    let inv = &mut ctx.accounts.confidential_invoice;
    inv.status = ConfidentialInvoiceStatus::Paid as u8;
    inv.paid_at = now;

    // Update merchant volume
    let merchant = &mut ctx.accounts.merchant;
    merchant.total_volume = merchant.total_volume.checked_add(revealed_amount).unwrap();

    emit!(ConfidentialInvoicePaid {
        confidential_invoice: inv.key(),
        merchant: ctx.accounts.merchant.key(),
        payer: ctx.accounts.payer.key(),
        revealed_amount,
        revealed_mint,
        merchant_amount,
        protocol_fee,
        paid_at: now,
    });

    Ok(())
}

/// Canonical commitment computation.
/// MUST match the off-chain TypeScript implementation exactly.
/// Layout: keccak256( amount_le_u64 || mint_bytes || nonce )
fn compute_commitment(amount: u64, mint: &Pubkey, nonce: &[u8; 32]) -> [u8; 32] {
    use anchor_lang::solana_program::keccak;

    let mut hasher_input = Vec::with_capacity(8 + 32 + 32);
    hasher_input.extend_from_slice(&amount.to_le_bytes());
    hasher_input.extend_from_slice(mint.as_ref());
    hasher_input.extend_from_slice(nonce);
    keccak::hash(&hasher_input).to_bytes()
}
