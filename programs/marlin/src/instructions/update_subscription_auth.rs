use anchor_lang::prelude::*;
use anchor_spl::token::{self, Approve, Token, TokenAccount};

use crate::errors::MarlinError;
use crate::state::{Subscription, SubscriptionPlan, SubscriptionStatus};

#[derive(Accounts)]
pub struct UpdateSubscriptionAuth<'info> {
    #[account(mut)]
    pub customer: Signer<'info>,

    #[account(
        seeds = [b"plan", plan.merchant.as_ref(), plan.plan_id.as_ref()],
        bump = plan.bump,
    )]
    pub plan: Account<'info, SubscriptionPlan>,

    #[account(
        mut,
        seeds = [b"sub", plan.key().as_ref(), customer.key().as_ref()],
        bump = subscription.bump,
        has_one = plan @ MarlinError::MintMismatch,
        constraint = subscription.customer == customer.key() @ MarlinError::Unauthorized,
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(
        mut,
        constraint = customer_token_account.key() == subscription.customer_token_account @ MarlinError::MintMismatch,
        constraint = customer_token_account.owner == customer.key() @ MarlinError::WrongOwner,
    )]
    pub customer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<UpdateSubscriptionAuth>, new_max_total_authorized: u64) -> Result<()> {
    let sub = &mut ctx.accounts.subscription;

    require!(
        sub.status != SubscriptionStatus::Canceled as u8,
        MarlinError::SubscriptionNotActive
    );

    require!(
        new_max_total_authorized >= sub.total_charged + ctx.accounts.plan.amount_per_period,
        MarlinError::InsufficientAuthorization
    );

    // The remaining allowance to approve as delegate
    let remaining = new_max_total_authorized.checked_sub(sub.total_charged).unwrap();

    sub.max_total_authorized = new_max_total_authorized;

    // CPI: re-approve subscription PDA as delegate with new remaining amount
    token::approve(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Approve {
                to: ctx.accounts.customer_token_account.to_account_info(),
                delegate: sub.to_account_info(),
                authority: ctx.accounts.customer.to_account_info(),
            },
        ),
        remaining,
    )?;

    Ok(())
}
