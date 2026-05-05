use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::MarlinError;
use crate::state::{Invoice, InvoiceStatus, Merchant};
use crate::{PROTOCOL_FEE_BPS, BPS_DENOMINATOR, PROTOCOL_FEE_RECEIVER};

#[event]
pub struct InvoicePaid {
    pub merchant: Pubkey,
    pub invoice: Pubkey,
    pub payer: Pubkey,
    pub amount: u64,
    pub fee: u64,
    pub mint: Pubkey,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct PayInvoice<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"merchant", merchant.authority.as_ref()],
        bump = merchant.bump,
    )]
    pub merchant: Account<'info, Merchant>,

    #[account(
        mut,
        seeds = [b"invoice", merchant.key().as_ref(), invoice.invoice_id.as_ref()],
        bump = invoice.bump,
        has_one = merchant @ MarlinError::MintMismatch,
    )]
    pub invoice: Account<'info, Invoice>,

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

pub fn handler(ctx: Context<PayInvoice>) -> Result<()> {
    let invoice = &ctx.accounts.invoice;

    // Validate status
    require!(
        invoice.status == InvoiceStatus::Open as u8,
        MarlinError::InvoiceNotOpen
    );

    // Validate not expired
    let now = Clock::get()?.unix_timestamp;
    if invoice.due_at != 0 {
        require!(now <= invoice.due_at, MarlinError::InvoiceExpired);
    }

    // Validate payer if restricted
    if invoice.customer_wallet != Pubkey::default() {
        require!(
            ctx.accounts.payer.key() == invoice.customer_wallet,
            MarlinError::WrongPayer
        );
    }

    // Validate mint matches
    require!(
        ctx.accounts.mint.key() == invoice.mint,
        MarlinError::MintMismatch
    );

    let amount = invoice.amount;
    let fee = amount
        .checked_mul(PROTOCOL_FEE_BPS)
        .unwrap()
        .checked_div(BPS_DENOMINATOR)
        .unwrap();
    let merchant_amount = amount.checked_sub(fee).unwrap();

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
    if fee > 0 {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer_token_account.to_account_info(),
                    to: ctx.accounts.protocol_fee_token_account.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            fee,
        )?;
    }

    // Update invoice
    let invoice = &mut ctx.accounts.invoice;
    invoice.status = InvoiceStatus::Paid as u8;
    invoice.paid_at = now;

    // Update merchant volume
    let merchant = &mut ctx.accounts.merchant;
    merchant.total_volume = merchant.total_volume.checked_add(amount).unwrap();

    emit!(InvoicePaid {
        merchant: merchant.key(),
        invoice: invoice.key(),
        payer: ctx.accounts.payer.key(),
        amount,
        fee,
        mint: ctx.accounts.mint.key(),
        timestamp: now,
    });

    Ok(())
}
