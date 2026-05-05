use anchor_lang::prelude::*;

use crate::errors::MarlinError;
use crate::state::{Invoice, InvoiceStatus, Merchant};
use crate::is_supported_mint;

#[derive(Accounts)]
#[instruction(invoice_id: [u8; 16])]
pub struct CreateInvoice<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"merchant", authority.key().as_ref()],
        bump = merchant.bump,
        has_one = authority @ MarlinError::Unauthorized,
    )]
    pub merchant: Account<'info, Merchant>,

    #[account(
        init,
        payer = authority,
        space = Invoice::LEN,
        seeds = [b"invoice", merchant.key().as_ref(), invoice_id.as_ref()],
        bump,
    )]
    pub invoice: Account<'info, Invoice>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateInvoice>,
    invoice_id: [u8; 16],
    customer_wallet: Pubkey,
    amount: u64,
    mint: Pubkey,
    due_at: i64,
    memo_hash: [u8; 32],
) -> Result<()> {
    require!(amount > 0, MarlinError::InvalidAmount);
    require!(is_supported_mint(&mint), MarlinError::MintNotSupported);

    if due_at != 0 {
        let now = Clock::get()?.unix_timestamp;
        require!(due_at > now, MarlinError::InvalidDueDate);
    }

    let invoice = &mut ctx.accounts.invoice;
    invoice.merchant = ctx.accounts.merchant.key();
    invoice.invoice_id = invoice_id;
    invoice.customer_wallet = customer_wallet;
    invoice.amount = amount;
    invoice.mint = mint;
    invoice.due_at = due_at;
    invoice.status = InvoiceStatus::Open as u8;
    invoice.paid_at = 0;
    invoice.memo_hash = memo_hash;
    invoice.bump = ctx.bumps.invoice;
    invoice._reserved = [0u8; 64];

    Ok(())
}
