use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum ConfidentialInvoiceStatus {
    Open = 0,
    Paid = 1,
    Void = 2,
}

#[account]
pub struct ConfidentialInvoice {
    /// The merchant PDA key that owns this invoice.
    pub merchant: Pubkey,
    /// Unique invoice identifier (ULID bytes).
    pub invoice_id: [u8; 16],
    /// SHA-256 of canonical payload: keccak256(amount_le || mint_bytes || nonce)
    pub commitment_hash: [u8; 32],
    /// Recipient's x25519 public key (32 bytes).
    pub recipient_pubkey: [u8; 32],
    /// Pointer to encrypted payload (Arweave/IPFS/HTTPS URL), up to 128 bytes.
    pub encrypted_blob_url: [u8; 128],
    /// Actual length of the encrypted_blob_url content.
    pub encrypted_blob_url_len: u8,
    /// Current status of the confidential invoice.
    pub status: u8,
    /// On-chain payment proof: tx signature when paid (zeroed if unpaid).
    pub paid_tx_signature: [u8; 64],
    /// Unix timestamp when the invoice was created.
    pub created_at: i64,
    /// Unix timestamp when the invoice was paid.
    pub paid_at: i64,
    /// PDA bump seed.
    pub bump: u8,
}

impl ConfidentialInvoice {
    pub const LEN: usize = 8    // discriminator
        + 32                     // merchant
        + 16                     // invoice_id
        + 32                     // commitment_hash
        + 32                     // recipient_pubkey
        + 128                    // encrypted_blob_url
        + 1                      // encrypted_blob_url_len
        + 1                      // status
        + 64                     // paid_tx_signature
        + 8                      // created_at
        + 8                      // paid_at
        + 1;                     // bump
}
