use anchor_lang::prelude::*;
use anchor_spl::token::{self, Revoke, Token, TokenAccount};

use crate::errors::MarlinError;
use crate::state::{Merchant, Subscription, SubscriptionPlan, SubscriptionStatus};
use crate::instructions::pause_subscription::SubscriptionStatusChanged;

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
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

    #[account(
        mut,
        constraint = customer_token_account.key() == subscription.customer_token_account @ MarlinError::MintMismatch,
    )]
    pub customer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CancelSubscription>) -> Result<()> {
    let sub = &mut ctx.accounts.subscription;
    let signer_key = ctx.accounts.signer.key();

    // Only customer or merchant authority can cancel
    require!(
        signer_key == sub.customer || signer_key == ctx.accounts.merchant.authority,
        MarlinError::Unauthorized
    );

    // Cannot cancel an already canceled subscription
    require!(
        sub.status != SubscriptionStatus::Canceled as u8,
        MarlinError::SubscriptionNotActive
    );

    let now = Clock::get()?.unix_timestamp;
    let old_status = sub.status;
    sub.status = SubscriptionStatus::Canceled as u8;

    // If signer is customer, revoke the token delegation
    if signer_key == sub.customer {
        token::revoke(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Revoke {
                source: ctx.accounts.customer_token_account.to_account_info(),
                authority: ctx.accounts.signer.to_account_info(),
            },
        ))?;
    }

    emit!(SubscriptionStatusChanged {
        subscription: sub.key(),
        from_status: old_status,
        to_status: SubscriptionStatus::Canceled as u8,
        timestamp: now,
    });

    Ok(())
}
