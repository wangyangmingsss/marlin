use anchor_lang::prelude::*;

use crate::errors::MarlinError;
use crate::state::{ConfidentialInvoice, ConfidentialInvoiceStatus, Merchant};

#[event]
pub struct ConfidentialInvoiceCreated {
    pub confidential_invoice: Pubkey,
    pub merchant: Pubkey,
    pub commitment_hash: [u8; 32],
    pub recipient_pubkey: [u8; 32],
    pub created_at: i64,
}

#[derive(Accounts)]
#[instruction(invoice_id: [u8; 16])]
pub struct CreateConfidentialInvoice<'info> {
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
        space = ConfidentialInvoice::LEN,
        seeds = [b"cinvoice", merchant.key().as_ref(), invoice_id.as_ref()],
        bump,
    )]
    pub confidential_invoice: Account<'info, ConfidentialInvoice>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateConfidentialInvoice>,
    invoice_id: [u8; 16],
    commitment_hash: [u8; 32],
    recipient_pubkey: [u8; 32],
    encrypted_blob_url: Vec<u8>,
) -> Result<()> {
    require!(
        encrypted_blob_url.len() <= 128,
        MarlinError::EncryptedBlobUrlTooLong
    );
    require!(
        !commitment_hash.iter().all(|&b| b == 0),
        MarlinError::InvalidCommitmentHash
    );
    require!(
        !recipient_pubkey.iter().all(|&b| b == 0),
        MarlinError::InvalidRecipientPubkey
    );

    let now = Clock::get()?.unix_timestamp;
    let inv = &mut ctx.accounts.confidential_invoice;

    inv.merchant = ctx.accounts.merchant.key();
    inv.invoice_id = invoice_id;
    inv.commitment_hash = commitment_hash;
    inv.recipient_pubkey = recipient_pubkey;

    // Pad URL to fixed 128 bytes
    let mut url_buf = [0u8; 128];
    url_buf[..encrypted_blob_url.len()].copy_from_slice(&encrypted_blob_url);
    inv.encrypted_blob_url = url_buf;
    inv.encrypted_blob_url_len = encrypted_blob_url.len() as u8;

    inv.status = ConfidentialInvoiceStatus::Open as u8;
    inv.paid_tx_signature = [0u8; 64];
    inv.created_at = now;
    inv.paid_at = 0;
    inv.bump = ctx.bumps.confidential_invoice;

    emit!(ConfidentialInvoiceCreated {
        confidential_invoice: inv.key(),
        merchant: ctx.accounts.merchant.key(),
        commitment_hash,
        recipient_pubkey,
        created_at: now,
    });

    Ok(())
}
