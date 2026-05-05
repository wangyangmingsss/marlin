use anchor_lang::prelude::*;

#[account]
pub struct Merchant {
    /// The authority that controls this merchant account.
    pub authority: Pubkey,
    /// Unique merchant identifier (UUID bytes).
    pub merchant_id: [u8; 16],
    /// Human-readable display name (UTF-8, padded with zeros).
    pub display_name: [u8; 64],
    /// Default mint for settlement.
    pub default_settlement_mint: Pubkey,
    /// Unix timestamp when the merchant was created.
    pub created_at: i64,
    /// Cumulative volume processed through this merchant.
    pub total_volume: u64,
    /// PDA bump seed.
    pub bump: u8,
    /// Reserved space for future upgrades.
    pub _reserved: [u8; 96],
}

impl Merchant {
    pub const LEN: usize = 8 + 32 + 16 + 64 + 32 + 8 + 8 + 1 + 96;
}
