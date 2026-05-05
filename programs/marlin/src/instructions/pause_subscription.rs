use anchor_lang::prelude::*;

use crate::errors::MarlinError;
use crate::state::{Merchant, Subscription, SubscriptionPlan, SubscriptionStatus};

#[event]
pub struct SubscriptionStatusChanged {
    pub subscription: Pubkey,
    pub from_status: u8,
    pub to_status: u8,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct PauseSubscription<'info> {
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"merchant", merchant.authority.as_ref()],
        bump = merchant.bump,
    )]
    pub merchant: Account<'info, Merchant>,

    #[account(
        seeds = [b"plan", merchant.key().as_ref(), plan.plan_id.as_ref()],
        bump = plan.bump,
        has_one = merchant @ MarlinError::MintMismatch,
    )]
    pub plan: Account<'info, SubscriptionPlan>,

    #[account(
        mut,
        seeds = [b"sub", plan.key().as_ref(), subscription.customer.as_ref()],
        bump = subscription.bump,
        has_one = plan @ MarlinError::MintMismatch,
        has_one = merchant @ MarlinError::MintMismatch,
    )]
    pub subscription: Account<'info, Subscription>,
}

pub fn handler(ctx: Context<PauseSubscription>) -> Result<()> {
    let sub = &mut ctx.accounts.subscription;
    let signer_key = ctx.accounts.signer.key();

    // Only customer or merchant authority can pause
    require!(
        signer_key == sub.customer || signer_key == ctx.accounts.merchant.authority,
        MarlinError::Unauthorized
    );

    require!(
        sub.status == SubscriptionStatus::Active as u8,
        MarlinError::SubscriptionNotActive
    );

    let now = Clock::get()?.unix_timestamp;
    let old_status = sub.status;
    sub.status = SubscriptionStatus::Paused as u8;

    emit!(SubscriptionStatusChanged {
        subscription: sub.key(),
        from_status: old_status,
        to_status: SubscriptionStatus::Paused as u8,
        timestamp: now,
    });

    Ok(())
}
