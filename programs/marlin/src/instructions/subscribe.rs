use anchor_lang::prelude::*;
use anchor_spl::token::{self, Approve, Token, TokenAccount};

use crate::errors::MarlinError;
use crate::state::{Merchant, Subscription, SubscriptionPlan, SubscriptionStatus};

#[event]
pub struct SubscriptionCreated {
    pub subscription: Pubkey,
    pub plan: Pubkey,
    pub customer: Pubkey,
    pub merchant: Pubkey,
    pub max_authorized: u64,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct Subscribe<'info> {
    #[account(mut)]
    pub customer: Signer<'info>,

    #[account(
        seeds = [b"merchant", merchant.authority.as_ref()],
        bump = merchant.bump,
    )]
    pub merchant: Account<'info, Merchant>,

    #[account(
        seeds = [b"plan", merchant.key().as_ref(), plan.plan_id.as_ref()],
        bump = plan.bump,
        has_one = merchant @ MarlinError::MintMismatch,
        constraint = plan.active @ MarlinError::PlanInactive,
    )]
    pub plan: Account<'info, SubscriptionPlan>,

    #[account(
        init,
        payer = customer,
        space = Subscription::LEN,
        seeds = [b"sub", plan.key().as_ref(), customer.key().as_ref()],
        bump,
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(
        mut,
        constraint = customer_token_account.owner == customer.key() @ MarlinError::WrongOwner,
        constraint = customer_token_account.mint == plan.mint @ MarlinError::MintMismatch,
    )]
    pub customer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Subscribe>, max_total_authorized: u64) -> Result<()> {
    let plan = &ctx.accounts.plan;

    require!(
        max_total_authorized >= plan.amount_per_period,
        MarlinError::InsufficientAuthorization
    );

    let now = Clock::get()?.unix_timestamp;
    let next_charge_at = now + plan.trial_seconds as i64;

    let sub = &mut ctx.accounts.subscription;
    sub.plan = plan.key();
    sub.merchant = ctx.accounts.merchant.key();
    sub.customer = ctx.accounts.customer.key();
    sub.customer_token_account = ctx.accounts.customer_token_account.key();
    sub.started_at = now;
    sub.next_charge_at = next_charge_at;
    sub.charges_count = 0;
    sub.total_charged = 0;
    sub.max_total_authorized = max_total_authorized;
    sub.status = SubscriptionStatus::Active as u8;
    sub.bump = ctx.bumps.subscription;
    sub.consecutive_failures = 0;
    sub.last_failure_at = 0;
    sub._reserved = [0u8; 52];

    // CPI: approve subscription PDA as delegate on customer token account
    let delegate = sub.key();
    // We need the subscription PDA to be the delegate. Since the subscription account
    // is being initialized in this same tx, we use its key.
    token::approve(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Approve {
                to: ctx.accounts.customer_token_account.to_account_info(),
                delegate: sub.to_account_info(),
                authority: ctx.accounts.customer.to_account_info(),
            },
        ),
        max_total_authorized,
    )?;

    emit!(SubscriptionCreated {
        subscription: delegate,
        plan: plan.key(),
        customer: ctx.accounts.customer.key(),
        merchant: ctx.accounts.merchant.key(),
        max_authorized: max_total_authorized,
        timestamp: now,
    });

    Ok(())
}
