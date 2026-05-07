use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

// Program ID placeholder - generate with `anchor keys list` and replace before deployment
declare_id!("HXAnpNiguZiixfc3yTW5gQtHD9ZVXpQ8kRmoKeTi879L");

/// Protocol fee: 50 basis points (0.5%)
pub const PROTOCOL_FEE_BPS: u64 = 50;
/// Basis points denominator
pub const BPS_DENOMINATOR: u64 = 10_000;
/// Minimum subscription period in seconds (1 day)
pub const MIN_PERIOD_SECONDS: u32 = 86_400;

// Protocol fee receiver — the wallet that collects 0.5% fees on every payment
// Ff4ewV5s2MqaxBHycsgRdHBy2EyC1vPLLWBW9M7HZVnr
pub const PROTOCOL_FEE_RECEIVER: Pubkey = Pubkey::new_from_array([
    0xd9, 0xc3, 0xd1, 0xc7, 0x63, 0x92, 0x70, 0x63,
    0xab, 0x32, 0x0c, 0xcf, 0x5a, 0x03, 0x4d, 0xb5,
    0x4c, 0x65, 0xe5, 0x39, 0x3d, 0x2a, 0xcb, 0xea,
    0x9c, 0xc3, 0xab, 0xc4, 0x5c, 0xe5, 0xe0, 0x13,
]);

/// Returns true if the given mint is in the supported stablecoin allowlist.
pub fn is_supported_mint(mint: &Pubkey) -> bool {
    let supported = [
        // Mainnet
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
        "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", // PYUSD
        "2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH", // USDG
        // Devnet
        "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // USDC devnet
        "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM", // PYUSD devnet (old)
        "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr", // USDG devnet (old)
        "6Sixd38HFpnvYxuHzSCWcb6RxYDxHuaJHPvcfY1xi83b", // Mock PYUSD devnet
        "Av4Ya9AJ3CPo7G8Vy8BKYDMqAdTKFfhEQvzKWEomgvMm", // Mock USDG devnet
    ];
    supported.iter().any(|s| mint.to_string() == *s)
}

#[program]
pub mod marlin {
    use super::*;

    pub fn initialize_merchant(
        ctx: Context<InitializeMerchant>,
        merchant_id: [u8; 16],
        display_name: [u8; 64],
        default_settlement_mint: Pubkey,
    ) -> Result<()> {
        instructions::initialize_merchant::handler(ctx, merchant_id, display_name, default_settlement_mint)
    }

    pub fn update_merchant(
        ctx: Context<UpdateMerchant>,
        display_name: Option<[u8; 64]>,
        default_settlement_mint: Option<Pubkey>,
    ) -> Result<()> {
        instructions::update_merchant::handler(ctx, display_name, default_settlement_mint)
    }

    pub fn create_invoice(
        ctx: Context<CreateInvoice>,
        invoice_id: [u8; 16],
        customer_wallet: Pubkey,
        amount: u64,
        mint: Pubkey,
        due_at: i64,
        memo_hash: [u8; 32],
    ) -> Result<()> {
        instructions::create_invoice::handler(ctx, invoice_id, customer_wallet, amount, mint, due_at, memo_hash)
    }

    pub fn pay_invoice(ctx: Context<PayInvoice>) -> Result<()> {
        instructions::pay_invoice::handler(ctx)
    }

    pub fn void_invoice(ctx: Context<VoidInvoice>) -> Result<()> {
        instructions::void_invoice::handler(ctx)
    }

    pub fn create_subscription_plan(
        ctx: Context<CreateSubscriptionPlan>,
        plan_id: [u8; 16],
        name: [u8; 64],
        amount_per_period: u64,
        mint: Pubkey,
        period_seconds: u32,
        trial_seconds: u32,
    ) -> Result<()> {
        instructions::create_subscription_plan::handler(
            ctx, plan_id, name, amount_per_period, mint, period_seconds, trial_seconds,
        )
    }

    pub fn set_plan_active(ctx: Context<SetPlanActive>, active: bool) -> Result<()> {
        instructions::set_plan_active::handler(ctx, active)
    }

    pub fn subscribe(ctx: Context<Subscribe>, max_total_authorized: u64) -> Result<()> {
        instructions::subscribe::handler(ctx, max_total_authorized)
    }

    pub fn charge_subscription(ctx: Context<ChargeSubscription>) -> Result<()> {
        instructions::charge_subscription::handler(ctx)
    }

    pub fn pause_subscription(ctx: Context<PauseSubscription>) -> Result<()> {
        instructions::pause_subscription::handler(ctx)
    }

    pub fn resume_subscription(ctx: Context<ResumeSubscription>) -> Result<()> {
        instructions::resume_subscription::handler(ctx)
    }

    pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
        instructions::cancel_subscription::handler(ctx)
    }

    pub fn update_subscription_authorization(
        ctx: Context<UpdateSubscriptionAuth>,
        new_max_total_authorized: u64,
    ) -> Result<()> {
        instructions::update_subscription_auth::handler(ctx, new_max_total_authorized)
    }

    pub fn create_confidential_invoice(
        ctx: Context<CreateConfidentialInvoice>,
        invoice_id: [u8; 16],
        commitment_hash: [u8; 32],
        recipient_pubkey: [u8; 32],
        encrypted_blob_url: Vec<u8>,
    ) -> Result<()> {
        instructions::create_confidential_invoice::handler(
            ctx, invoice_id, commitment_hash, recipient_pubkey, encrypted_blob_url,
        )
    }

    pub fn pay_confidential_invoice(
        ctx: Context<PayConfidentialInvoice>,
        revealed_amount: u64,
        revealed_mint: Pubkey,
        nonce: [u8; 32],
    ) -> Result<()> {
        instructions::pay_confidential_invoice::handler(
            ctx, revealed_amount, revealed_mint, nonce,
        )
    }
}
