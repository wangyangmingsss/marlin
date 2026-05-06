use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum SubscriptionStatus {
    Active = 0,
    Paused = 1,
    Canceled = 2,
    Failed = 3,
}

#[account]
pub struct SubscriptionPlan {
    /// The merchant PDA key that owns this plan.
    pub merchant: Pubkey,
    /// Unique plan identifier (UUID bytes).
    pub plan_id: [u8; 16],
    /// Human-readable plan name (UTF-8, padded with zeros).
    pub name: [u8; 64],
    /// Amount charged per period in smallest mint units.
    pub amount_per_period: u64,
    /// SPL token mint for this plan.
    pub mint: Pubkey,
    /// Duration of each billing period in seconds.
    pub period_seconds: u32,
    /// Duration of trial period in seconds (0 = no trial).
    pub trial_seconds: u32,
    /// Whether the plan is currently accepting new subscribers.
    pub active: bool,
    /// PDA bump seed.
    pub bump: u8,
    /// Reserved space for future upgrades.
    pub _reserved: [u8; 64],
}

impl SubscriptionPlan {
    pub const LEN: usize = 8 + 32 + 16 + 64 + 8 + 32 + 4 + 4 + 1 + 1 + 64;
}

#[account]
pub struct Subscription {
    /// The subscription plan PDA key.
    pub plan: Pubkey,
    /// The merchant PDA key.
    pub merchant: Pubkey,
    /// The customer wallet that subscribed.
    pub customer: Pubkey,
    /// The customer's token account used for charges.
    pub customer_token_account: Pubkey,
    /// Unix timestamp when the subscription started.
    pub started_at: i64,
    /// Unix timestamp of the next scheduled charge.
    pub next_charge_at: i64,
    /// Total number of successful charges.
    pub charges_count: u32,
    /// Cumulative amount charged.
    pub total_charged: u64,
    /// Maximum total amount the customer has authorized.
    pub max_total_authorized: u64,
    /// Current subscription status.
    pub status: u8,
    /// PDA bump seed.
    pub bump: u8,
    /// Number of consecutive charge failures (resets on success).
    pub consecutive_failures: u32,
    /// Unix timestamp of the last failed charge attempt.
    pub last_failure_at: i64,
    /// Reserved space for future upgrades.
    pub _reserved: [u8; 52],
}

impl Subscription {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 4 + 8 + 8 + 1 + 1 + 4 + 8 + 52;
}
