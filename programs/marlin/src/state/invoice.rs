use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum InvoiceStatus {
    Open = 0,
    Paid = 1,
    Void = 2,
    Expired = 3,
}

#[account]
pub struct Invoice {
    /// The merchant PDA key that owns this invoice.
    pub merchant: Pubkey,
    /// Unique invoice identifier (UUID bytes).
    pub invoice_id: [u8; 16],
    /// The customer wallet expected to pay (Pubkey::default() means anyone can pay).
    pub customer_wallet: Pubkey,
    /// Amount in the smallest unit of the mint.
    pub amount: u64,
    /// SPL token mint for this invoice.
    pub mint: Pubkey,
    /// Unix timestamp when the invoice expires (0 = no expiry).
    pub due_at: i64,
    /// Current status of the invoice.
    pub status: u8,
    /// Unix timestamp when the invoice was paid.
    pub paid_at: i64,
    /// SHA-256 hash of the memo/description.
    pub memo_hash: [u8; 32],
    /// PDA bump seed.
    pub bump: u8,
    /// Reserved space for future upgrades.
    pub _reserved: [u8; 64],
}

impl Invoice {
    pub const LEN: usize = 8 + 32 + 16 + 32 + 8 + 32 + 8 + 1 + 8 + 32 + 1 + 64;
}
