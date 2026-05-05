use anchor_lang::prelude::*;

use crate::errors::MarlinError;
use crate::state::{Invoice, InvoiceStatus, Merchant};

#[event]
pub struct InvoiceVoided {
    pub merchant: Pubkey,
    pub invoice: Pubkey,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct VoidInvoice<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"merchant", authority.key().as_ref()],
        bump = merchant.bump,
        has_one = authority @ MarlinError::Unauthorized,
    )]
    pub merchant: Account<'info, Merchant>,

    #[account(
        mut,
        seeds = [b"invoice", merchant.key().as_ref(), invoice.invoice_id.as_ref()],
        bump = invoice.bump,
        has_one = merchant @ MarlinError::MintMismatch,
    )]
    pub invoice: Account<'info, Invoice>,
}

pub fn handler(ctx: Context<VoidInvoice>) -> Result<()> {
    let invoice = &mut ctx.accounts.invoice;

    require!(
        invoice.status == InvoiceStatus::Open as u8,
        MarlinError::InvoiceNotOpen
    );

    let now = Clock::get()?.unix_timestamp;
    invoice.status = InvoiceStatus::Void as u8;

    emit!(InvoiceVoided {
        merchant: ctx.accounts.merchant.key(),
        invoice: invoice.key(),
        timestamp: now,
    });

    Ok(())
}
